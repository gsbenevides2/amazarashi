import { asc, eq, sql } from "drizzle-orm";
import { cover } from "../../cover";
import { db } from "../../db";
import { lyricLines, musicVideos, releases, songs, tracks } from "../../db/schema";

// troca coverImage pela URL final
const withCover = <T extends { coverImage: string | null }>({ coverImage, ...r }: T) => ({ ...r, cover: cover({ coverImage }) });

export abstract class Songs {
  static list() {
    // thin = descrição ainda é rascunho e não há letra: a página vai com noindex e fica fora do sitemap
    return db
      .select({
        slug: songs.slug,
        releaseDate: songs.releaseDate,
        thin: sql<boolean>`(${songs.description} like '%Rascunho%' and not exists (select 1 from ${lyricLines} where ${lyricLines.songId} = ${songs.id}))`,
      })
      .from(songs);
  }

  static async get(slug: string) {
    const [song] = await db.select().from(songs).where(eq(songs.slug, slug));
    if (!song) return null;

    const lyrics = await db.select().from(lyricLines).where(eq(lyricLines.songId, song.id)).orderBy(asc(lyricLines.position));
    const cols = { slug: releases.slug, title: releases.title, romaji: releases.romaji, coverImage: releases.coverImage, releaseDate: releases.releaseDate };
    const [album] = await db.select(cols).from(releases).where(eq(releases.id, song.releaseId));
    const albumTracks = await db.select().from(tracks).where(eq(tracks.releaseId, song.releaseId)).orderBy(asc(tracks.trackNumber));
    // vitrine: todos os lançamentos que têm esta faixa
    const appearsIn = await db
      .select({ ...cols, trackCount: db.$count(tracks, eq(tracks.releaseId, releases.id)) })
      .from(tracks)
      .innerJoin(releases, eq(releases.id, tracks.releaseId))
      .where(eq(tracks.songId, song.id));

    // miniatura e GIF do videoclipe, quando ele também está em /videoclipes
    const [clip] = song.videoclipId ? await db.select({ coverImage: musicVideos.coverImage, gifPreview: musicVideos.gifPreview }).from(musicVideos).where(eq(musicVideos.youtubeId, song.videoclipId)) : [];

    return {
      ...song,
      videoclip: song.videoclipId ? { youtubeId: song.videoclipId, coverImage: clip?.coverImage ?? null, gifPreview: clip?.gifPreview ?? null } : null,
      trackNumber: albumTracks.find((x) => x.songId === song.id)?.trackNumber ?? 1,
      album: { ...withCover(album), trackCount: albumTracks.length },
      appearsIn: appearsIn.map(withCover),
      // a letra volta como "kana\nromaji\npt"; t nulo = verso sem sincronia
      lyrics: lyrics.map((l) => ({ t: l.startSecond, text: [l.kana, l.romaji, l.pt].join("\n") })),
    };
  }
}
