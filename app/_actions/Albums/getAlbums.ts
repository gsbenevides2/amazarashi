"use server";

import { connectToDatabase } from "@/db";
import { albunsTable } from "@/db/schema";

type Return = Promise<(typeof albunsTable.$inferSelect)[]>;

export async function getAlbums(): Return {
  const db = connectToDatabase();
  return db.select().from(albunsTable);
}
