"use server";

import { connectToDatabase } from "@/db";
import { lyrics_lines, lyrics_lines_texts, lyricsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getLyricsFromMusic(musicId: string) {
  const db = connectToDatabase();
  const lyricsReturned = await db
    .select({
      id: lyricsTable.id,
    })
    .from(lyricsTable)
    .where(eq(lyricsTable.musicId, musicId));

  return await Promise.all(
    lyricsReturned.map(async (lyricReturned) => {
      const linesReturned = await db
        .select({
          id: lyrics_lines.id,
          start: lyrics_lines.start,
          end: lyrics_lines.end,
          position: lyrics_lines.position,
        })
        .from(lyrics_lines)
        .where(eq(lyrics_lines.lyricsId, lyricReturned.id))
        .orderBy(lyrics_lines.position);
      return {
        id: lyricReturned.id,
        musicId: musicId,
        lines: await Promise.all(
          linesReturned.map(async (lineReturned) => {
            const textsReturned = await db
              .select({
                id: lyrics_lines_texts.id,
                languageId: lyrics_lines_texts.languageId,
                text: lyrics_lines_texts.text,
              })
              .from(lyrics_lines_texts)
              .where(eq(lyrics_lines_texts.lyricsLineId, lineReturned.id));
            return {
              id: lineReturned.id,
              position: lineReturned.position,
              start: lineReturned.start,
              end: lineReturned.end,
              texts: textsReturned.map((textReturned) => ({
                id: textReturned.id,
                languageId: textReturned.languageId,
                text: textReturned.text,
              })),
            };
          }),
        ),
      };
    }),
  );
}
