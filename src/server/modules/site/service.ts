import { asc, desc, eq, isNotNull, getTableColumns, sql } from "drizzle-orm";
import { db } from "../../db";
import { animeSongs, bandMembers, bandStats, highlights, infoCards, menuItems, musicVideos, releases, siteSettings, socialLinks, songs, sources, timelineEvents } from "../../db/schema";

export abstract class Site {
  static musicVideos() {
    return db.select().from(musicVideos).where(isNotNull(musicVideos.position)).orderBy(asc(musicVideos.position));
  }

  static async chrome() {
    const settings = await db.select().from(siteSettings);
    return {
      settings: Object.fromEntries(settings.map((s) => [s.key, s.value ?? s.coverImage ?? ""])) as Record<string, string>,
      menu: await db.select().from(menuItems).orderBy(asc(menuItems.position)),
      socials: await db.select().from(socialLinks).orderBy(asc(socialLinks.position)),
    };
  }

  static async home() {
    return {
      highlights: await db.select().from(highlights).orderBy(asc(highlights.position)),
      infoCards: await db.select().from(infoCards).orderBy(asc(infoCards.position)),
    };
  }

  // Índice inteiro (poucas centenas de linhas): o cliente filtra, sem uma ida ao servidor por tecla.
  static async search() {
    const albums = await db
      .select({ slug: releases.slug, title: releases.title, romaji: releases.romaji, nameEn: releases.nameEn, namePt: releases.namePt, cover: releases.coverImage, date: releases.releaseDate })
      .from(releases)
      .where(isNotNull(releases.slug))
      .orderBy(desc(releases.releaseDate));
    const tracks = await db
      .select({ slug: songs.slug, romaji: songs.romaji, kana: songs.kana, nameEn: songs.nameEn, namePt: songs.namePt, album: releases.romaji, albumTitle: releases.title, cover: releases.coverImage })
      .from(songs)
      .innerJoin(releases, eq(songs.releaseId, releases.id))
      .orderBy(asc(songs.romaji));
    return { albums, songs: tracks };
  }

  static async biography() {
    return {
      stats: await db.select().from(bandStats).orderBy(asc(bandStats.position)),
      members: await db.select().from(bandMembers).orderBy(asc(bandMembers.position)),
      timeline: await db.select().from(timelineEvents).orderBy(asc(timelineEvents.position)),
      animeSongs: await db
        .select({ ...getTableColumns(animeSongs), coverImage: sql<string | null>`coalesce(${animeSongs.coverImage}, ${releases.coverImage})`, slug: songs.slug })
        .from(animeSongs)
        .leftJoin(songs, eq(animeSongs.songId, songs.id))
        .leftJoin(releases, eq(songs.releaseId, releases.id))
        .orderBy(asc(animeSongs.year)),
      sources: await db.select().from(sources),
    };
  }
}
