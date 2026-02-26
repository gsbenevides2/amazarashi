"use server";
import { JSONAlbum } from "@/data/types";
import fs from "fs/promises";
import path from "path";

export async function getAlbum(albumId: string) {
  const dataExists = await fs
    .readFile(
      path.join(process.cwd(), "data", "albums", albumId, "data.json"),
      "utf-8",
    )
    .then((data) => JSON.parse(data) as JSONAlbum)
    .catch(() => null);
  if (!dataExists) return null;
  return {
    ...dataExists,
    cover: `/albums/${albumId}.jpg`,
  };
}
