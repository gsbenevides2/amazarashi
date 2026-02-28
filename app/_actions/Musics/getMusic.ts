"use server";

import { connectToDatabase } from "@/db";
import { musicsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type Return = Promise<typeof musicsTable.$inferSelect | null>;

export async function getMusic(musicId: string): Return {
  const db = connectToDatabase();

  const music = await db
    .select()
    .from(musicsTable)
    .where(eq(musicsTable.id, musicId))
    .get();
  if (!music) {
    return null;
  }

  return music;
}
