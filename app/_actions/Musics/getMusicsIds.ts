"use server";

import { connectToDatabase } from "@/db";
import { musicsTable } from "@/db/schema";

export async function getMusicsIds(): Promise<string[]> {
  const db = connectToDatabase();
  const musics = await db
    .select({
      id: musicsTable.id,
    })
    .from(musicsTable);
  return musics.map((music) => music.id);
}
