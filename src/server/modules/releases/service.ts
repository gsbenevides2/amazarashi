import { asc, desc, eq } from "drizzle-orm";
import { cover } from "../../cover";
import { db } from "../../db";
import { releases, songs, tracks } from "../../db/schema";
import type { z } from "zod";
import type { listQuery } from "./model";

export abstract class Releases {
  static async list(category?: z.infer<typeof listQuery>["category"]) {
    const list = await db
      .select({ slug: releases.slug, category: releases.category, title: releases.title, romaji: releases.romaji, coverImage: releases.coverImage, releaseDate: releases.releaseDate })
      .from(releases)
      .where(category ? eq(releases.category, category) : undefined)
      .orderBy(desc(releases.releaseDate));
    return list.map(({ coverImage, ...r }) => ({ ...r, cover: cover({ coverImage }) }));
  }

  static async get(slug: string) {
    const [release] = await db.select().from(releases).where(eq(releases.slug, slug));
    if (!release) return null;
    const trackList = await db
      .select({ title: tracks.title, duration: tracks.duration, songSlug: songs.slug, romaji: songs.romaji })
      .from(tracks)
      .leftJoin(songs, eq(songs.id, tracks.songId))
      .where(eq(tracks.releaseId, release.id))
      .orderBy(asc(tracks.trackNumber));
    const { coverImage, ...rest } = release;
    return { ...rest, cover: cover(release), tracks: trackList };
  }
}
