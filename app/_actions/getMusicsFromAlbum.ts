import { connectToDatabase } from "@/db";
import { musics_albumsTable, musicsTable } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function getMusicsFromAlbum(albumId: string) {
  const db = connectToDatabase();
  const musicsResponse = await db
    .select()
    .from(musics_albumsTable)
    .leftJoin(musicsTable, eq(musics_albumsTable.musicId, musicsTable.id))
    .where(eq(musics_albumsTable.albumId, albumId))
    .orderBy(asc(musics_albumsTable.position));

  return musicsResponse
    .filter(({ musics }) => !!musics)
    .map(({ musics, musics_albums }) => ({
      ...musics,
      position: musics_albums.position,
    })) as (typeof musicsTable.$inferSelect & { position: number })[];
}
