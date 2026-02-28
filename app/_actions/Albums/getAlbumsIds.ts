"use server";

import { connectToDatabase } from "@/db";
import { albunsTable } from "@/db/schema";

export async function getAlbumsIds(): Promise<string[]> {
  const db = connectToDatabase();
  const albums = await db
    .select({
      id: albunsTable.id,
    })
    .from(albunsTable);
  return albums.map((album) => album.id);
}
