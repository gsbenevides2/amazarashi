"use server";

import { connectToDatabase } from "@/db";
import { languagesTable } from "@/db/schema";

export async function getLanguages() {
  const db = connectToDatabase();
  return await db.select().from(languagesTable);
}
