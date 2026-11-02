// Gera o blur das imagens já cadastradas (capas, miniaturas, hero...). Uso: bun scripts/backfill-blurs.ts
import { isNotNull } from "drizzle-orm";
import { saveBlur } from "../src/server/blur";
import { db } from "../src/server/db";
import { animeSongs, highlights, imageBlurs, infoCards, musicVideos, releases, siteSettings } from "../src/server/db/schema";

const urls = new Set<string>();
for (const [t, c] of [[releases, releases.coverImage], [musicVideos, musicVideos.coverImage], [animeSongs, animeSongs.coverImage], [highlights, highlights.coverImage], [infoCards, infoCards.coverImage], [siteSettings, siteSettings.coverImage]] as const)
  for (const r of await db.select({ u: c }).from(t).where(isNotNull(c))) if (r.u) urls.add(r.u);
const done = new Set((await db.select().from(imageBlurs)).map((r) => r.url));
for (const u of urls) {
  if (done.has(u)) continue;
  try {
    await saveBlur(u, Buffer.from(await (await fetch(u)).arrayBuffer()));
    console.log("ok", u);
  } catch (e) {
    console.error("falhou", u, e);
  }
}
process.exit(0);
