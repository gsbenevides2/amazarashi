import { asc, eq } from "drizzle-orm";
import { specs } from "../../../components/admin/specs";
import { db } from "../../db";
import * as s from "../../db/schema";

const tables = {
  releases: s.releases,
  songs: s.songs,
  "music-videos": s.musicVideos,
  "anime-songs": s.animeSongs,
  "band-members": s.bandMembers,
  "timeline-events": s.timelineEvents,
  "band-stats": s.bandStats,
  sources: s.sources,
  highlights: s.highlights,
  "site-settings": s.siteSettings,
  "menu-items": s.menuItems,
  "social-links": s.socialLinks,
  "info-cards": s.infoCards,
} as const;
export type Name = keyof typeof tables;
type Row = Record<string, unknown>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const lines = (v: unknown) => String(v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const cols = (line: string, n: number) => {
  const p = line.split("|").map((x) => x.trim());
  return [...p.slice(0, n - 1), p.slice(n - 1).join(" | ")];
};

// Mantém só os campos declarados; "" vira null, número vira number.
function clean(name: Name, body: Row) {
  const out: Row = {};
  for (const f of specs[name].fields) {
    if (f.virtual) continue;
    const v = body[f.name];
    const empty = v === undefined || v === null || v === "";
    if (empty && f.required) throw new Error(`Campo obrigatório: ${f.label}`);
    out[f.name] = empty ? null : f.type === "number" || f.type === "ref" ? Number(v) : v;
  }
  return out;
}

// Campos virtuais (tabelas filhas editadas como texto). Escrevem dentro da transação do salvamento.
const virtual: Partial<Record<Name, { read: (id: number) => Promise<Row>; write: (tx: Tx, id: number, body: Row) => Promise<void> }>> = {
  releases: {
    read: async (id) => {
      const rows = await db.select({ title: s.tracks.title, duration: s.tracks.duration, slug: s.songs.slug }).from(s.tracks).leftJoin(s.songs, eq(s.songs.id, s.tracks.songId)).where(eq(s.tracks.releaseId, id)).orderBy(asc(s.tracks.trackNumber));
      return { tracks: rows.map((x) => [x.title, x.duration, x.slug ?? ""].join(" | ").replace(/ \| $/, "")).join("\n") };
    },
    write: async (tx, id, body) => {
      await tx.delete(s.tracks).where(eq(s.tracks.releaseId, id));
      const list = lines(body.tracks);
      for (const [i, line] of list.entries()) {
        const [title, duration, slug] = cols(line, 3);
        const [song] = slug ? await tx.select({ id: s.songs.id }).from(s.songs).where(eq(s.songs.slug, slug)) : [];
        if (slug && !song) throw new Error(`Música não encontrada: ${slug}`);
        await tx.insert(s.tracks).values({ releaseId: id, trackNumber: i + 1, title, duration: duration ?? "", songId: song?.id });
      }
    },
  },
  songs: {
    read: async (id) => {
      const rows = await db.select().from(s.lyricLines).where(eq(s.lyricLines.songId, id)).orderBy(asc(s.lyricLines.position));
      // primeira coluna vazia = verso sem sincronia
      return { lyrics: rows.map((l) => [l.startSecond ?? "", l.kana, l.romaji, l.pt].join(" | ")).join("\n") };
    },
    write: async (tx, id, body) => {
      await tx.delete(s.lyricLines).where(eq(s.lyricLines.songId, id));
      for (const [i, line] of lines(body.lyrics).entries()) {
        const [sec, kana, romaji, pt] = cols(line, 4);
        const timed = sec !== "" && sec !== undefined;
        if (timed && Number.isNaN(Number(sec))) throw new Error(`Segundo inválido na letra: ${line}`);
        await tx.insert(s.lyricLines).values({ songId: id, position: i + 1, startSecond: timed ? Number(sec) : null, kana: kana ?? "", romaji: romaji ?? "", pt: pt ?? "" });
      }
    },
  },
};

// Apagar um pai leva os filhos que só existem por causa dele.
const cascade: Partial<Record<Name, (tx: Tx, id: number) => Promise<unknown>>> = {
  releases: (tx, id) => tx.delete(s.tracks).where(eq(s.tracks.releaseId, id)),
  songs: async (tx, id) => {
    await tx.delete(s.lyricLines).where(eq(s.lyricLines.songId, id));
    await tx.update(s.tracks).set({ songId: null }).where(eq(s.tracks.songId, id));
  },
};

export abstract class Admin {
  static isResource(n: string): n is Name {
    return n in tables;
  }

  static list(name: Name) {
    return db.select().from(tables[name]).orderBy(asc(tables[name].id));
  }

  static async get(name: Name, id: number) {
    const table = tables[name];
    const [row] = await db.select().from(table).where(eq(table.id, id));
    if (!row) return null;
    return { ...row, ...(await virtual[name]?.read(id)) };
  }

  static create(name: Name, body: Row) {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(tables[name]).values(clean(name, body) as never).returning({ id: tables[name].id });
      await virtual[name]?.write(tx, row.id, body);
      return row.id;
    });
  }

  static update(name: Name, id: number, body: Row) {
    const table = tables[name];
    return db.transaction(async (tx) => {
      await tx.update(table).set(clean(name, body) as never).where(eq(table.id, id));
      await virtual[name]?.write(tx, id, body);
    });
  }

  static remove(name: Name, id: number) {
    const table = tables[name];
    return db.transaction(async (tx) => {
      await cascade[name]?.(tx, id);
      await tx.delete(table).where(eq(table.id, id));
    });
  }
}
