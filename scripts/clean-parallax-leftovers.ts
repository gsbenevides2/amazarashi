// Limpeza depois de trocar capas/regerar parallax: apaga os registros de cover_parallax de capas que nenhum lançamento usa mais, os blurs (image_blurs)
// de imagens que nenhuma outra tabela referencia e os arquivos do S3 que nenhum registro referencia (mesma regra da tela Armazenamento do admin: ignora uploads da última hora).
// Sem argumentos só SIMULA. Uso: bun scripts/clean-parallax-leftovers.ts [--yes]
import { inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../src/server/db";
import { coverParallax, imageBlurs, releases } from "../src/server/db/schema";
import { Storage } from "../src/server/modules/admin/storage";
import { deleteObject } from "../src/server/s3";

const yes = process.argv.includes("--yes");
const used = (await db.select({ c: releases.coverImage }).from(releases)).map((r) => r.c).filter((c): c is string => !!c);
const stale = await db.select({ url: coverParallax.url }).from(coverParallax).where(notInArray(coverParallax.url, used));
console.log(`${stale.length} registro(s) de parallax de capas que nenhum lançamento usa mais`);
if (yes && stale.length) await db.delete(coverParallax).where(inArray(coverParallax.url, stale.map((s) => s.url)));

// blur de imagem que nenhuma outra tabela usa mais (a URL no image_blurs sozinha segura o arquivo antigo no S3)
const cols = await db.execute<{ t: string; c: string }>(sql`select table_name t, column_name c from information_schema.columns where table_schema = 'public' and data_type in ('text', 'character varying') and table_name not in ('image_blurs', 'cover_parallax')`);
const union = sql.join(cols.map(({ t, c }) => sql`select ${sql.identifier(c)}::text v from ${sql.identifier(t)}`), sql` union all `);
const blob = (await db.execute<{ v: string | null }>(union)).map((r) => r.v ?? "").join("\n");
const staleBlurs = (await db.select({ url: imageBlurs.url }).from(imageBlurs)).filter((b) => !blob.includes(b.url));
console.log(`${staleBlurs.length} blur(s) de imagens que nenhuma tabela usa mais`);
if (yes && staleBlurs.length) await db.delete(imageBlurs).where(inArray(imageBlurs.url, staleBlurs.map((b) => b.url)));

const orphans = await Storage.orphans(); // depois de apagar os registros: as camadas deles passam a ser órfãs
const mb = orphans.reduce((n, o) => n + o.size, 0) / 1e6;
const byDir = orphans.reduce<Record<string, number>>((m, o) => ((m[o.key.split("/")[0]] = (m[o.key.split("/")[0]] ?? 0) + 1), m), {});
console.log(`${orphans.length} arquivo(s) órfão(s) no S3 (${mb.toFixed(1)} MB):`, JSON.stringify(byDir));
if (!yes) {
  console.log("\nSimulação: nada foi apagado. Rode com --yes para apagar.");
  process.exit(0);
}
// calcula uma vez e apaga um a um (cada exclusão já tenta de novo se o S3 estiver instável)
let apagados = 0, falhas = 0;
for (const o of orphans) {
  try {
    await deleteObject(o.key);
    apagados++;
  } catch (e) {
    falhas++;
    console.error("não apagou", o.key, String(e).split("\n")[0].slice(0, 80));
  }
}
if (falhas) console.error(`${falhas} arquivo(s) ficaram para a próxima rodada (rode de novo).`);
console.log(`Pronto: ${stale.length} registro(s) de parallax, ${staleBlurs.length} blur(s) e ${apagados} arquivo(s) do S3 apagados.`);
process.exit(0);
