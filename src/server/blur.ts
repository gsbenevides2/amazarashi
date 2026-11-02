import sharp from "sharp";
import { db } from "./db";
import { imageBlurs } from "./db/schema";

export async function blurOf(input: Buffer) {
  const out = await sharp(input).resize(8, 8, { fit: "inside" }).webp({ quality: 20 }).toBuffer();
  return `data:image/webp;base64,${out.toString("base64")}`;
}

export async function saveBlur(url: string, input: Buffer) {
  const blur = await blurOf(input);
  await db.insert(imageBlurs).values({ url, blur }).onConflictDoUpdate({ target: imageBlurs.url, set: { blur } });
}
