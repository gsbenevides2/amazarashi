// Gera cor de destaque (e parallax pelo agente, com OPENROUTER_API_KEY) das capas de lançamento já cadastradas. Uso: bun scripts/backfill-parallax.ts [--force]
import { isNotNull } from "drizzle-orm";
import { db } from "../src/server/db";
import { coverParallax, releases } from "../src/server/db/schema";
import { generateParallax, prepareParallax } from "../src/server/parallax";

const force = process.argv.includes("--force");
const done = new Set((await db.select().from(coverParallax)).map((r) => r.url));
for (const { u } of await db.select({ u: releases.coverImage }).from(releases).where(isNotNull(releases.coverImage))) {
  if (!u || (done.has(u) && !force)) continue;
  try {
    const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
    await prepareParallax(u, buf);
    await generateParallax(u, buf);
    console.log("ok", u);
  } catch (e) {
    console.error("falhou", u, e);
  }
}
process.exit(0);
