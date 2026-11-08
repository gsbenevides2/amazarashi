// Refaz só o FUNDO dos parallax já gerados (sem chamar o modelo de linguagem): reconstrói os recortes a partir das camadas salvas no S3 e da capa
// original e roda o inpainting de novo com a folga atual do Draft (holeSigma). Use depois de ajustar o inpainting.
// Sem argumentos só SIMULA. Uso: bun scripts/rebuild-parallax-backgrounds.ts [--yes]
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/server/db";
import { coverParallax, releases } from "../src/server/db/schema";
import { sharp } from "../src/server/native";
import { Draft } from "../src/server/parallax";
import { deleteObject, uploadBuffer } from "../src/server/s3";
import type { ParallaxConfig } from "../src/lib/parallax";

const yes = process.argv.includes("--yes");
const prefix = `${process.env.S3_PUBLIC_URL!.replace(/\/+$/, "")}/`;

async function get(url: string) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i >= 3) throw e;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

const used = (await db.select({ c: releases.coverImage }).from(releases)).map((r) => r.c).filter((c): c is string => !!c);
const rows = (await db.select().from(coverParallax).where(inArray(coverParallax.url, used))).filter((r) => r.config);
console.log(`${rows.length} parallax em uso${yes ? "" : " (simulação: nada será gravado)"}`);
let n = 0, falhas = 0;
for (const row of rows) {
  const name = row.url.split("/").pop();
  try {
    const cfg: ParallaxConfig = JSON.parse(row.config!);
    const d = await Draft.from(await get(row.url));
    for (const l of cfg.layers) {
      const { data, info } = await sharp(await get(l.src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alpha = Buffer.alloc(d.w * d.h), ox = Math.round(l.x * d.w), oy = Math.round(l.y * d.h);
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const X = ox + x, Y = oy + y; if (X < d.w && Y < d.h) alpha[Y * d.w + X] = data[(y * info.width + x) * 4 + 3]; }
      d.restoreElement(l.name, l.depth, !!l.float, alpha);
    }
    const bg = await (await d.background()).webp({ quality: 90 }).toBuffer();
    if (yes) {
      const background = await uploadBuffer(`parallax/${crypto.randomUUID()}/fundo.webp`, bg, "image/webp");
      await db.update(coverParallax).set({ config: JSON.stringify({ ...cfg, background }) }).where(eq(coverParallax.url, row.url));
      if (cfg.background.startsWith(prefix)) await deleteObject(cfg.background.slice(prefix.length)).catch(() => {}); // o fundo antigo; órfão se falhar
    }
    n++;
    console.log(`[${n}/${rows.length}] ${name} ${(bg.length / 1024).toFixed(0)} KB ${yes ? "gravado" : "ok"}`);
  } catch (e) {
    falhas++;
    console.error(`FALHOU ${name}: ${String(e).split("\n")[0].slice(0, 120)}`);
  }
}
console.log(falhas ? `${falhas} falha(s); as demais ${yes ? "foram gravadas" : "passaram"}` : yes ? "Fundos refeitos." : "Simulação sem falhas. Rode com --yes para gravar.");
process.exit(0);
