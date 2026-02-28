"use server";

import { connectToDatabase } from "@/db";
import { albunsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type Return = Promise<typeof albunsTable.$inferSelect | null>;

export async function getAlbum(albumId: string): Return {
  const db = connectToDatabase();

  const album = await db
    .select()
    .from(albunsTable)
    .where(eq(albunsTable.id, albumId))
    .get();
  if (!album) {
    return null;
  }

  return album;
}
