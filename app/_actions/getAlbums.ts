"use server";
import { JSONAlbum } from "@/data/types";
import fs from "fs/promises";
import path from "path";

export async function getAlbums() {
  const folders = await fs.readdir(path.join(process.cwd(), "data", "albums"));
  const dataFiles = await Promise.all(
    folders.map((folder) =>
      fs
        .readFile(
          path.join(process.cwd(), "data", "albums", folder, "data.json"),
          "utf-8",
        )
        .then((data) => ({
          ...(JSON.parse(data) as JSONAlbum),
          id: folder,
        }))
        .catch(() => null),
    ),
  );
  return dataFiles
    .filter((data): data is JSONAlbum & { id: string } => data !== null)
    .map((data) => ({
      ...data,
      cover: `/albums/${data.id}.jpg`,
    }));
}
