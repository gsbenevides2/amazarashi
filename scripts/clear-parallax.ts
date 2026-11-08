// Remove os parallax gerados: apaga os arquivos `parallax/` do S3 e zera a config no banco (a cor de destaque do modal fica).
// Sem argumentos só SIMULA (nada é apagado). Uso: bun scripts/clear-parallax.ts [--yes]
import { isNotNull } from "drizzle-orm";
import { db } from "../src/server/db";
import { coverParallax } from "../src/server/db/schema";
import { deleteObject, listObjects } from "../src/server/s3";

const yes = process.argv.includes("--yes");
const rows = await db.select().from(coverParallax).where(isNotNull(coverParallax.config));
const keys = (await listObjects()).filter((o) => o.key.startsWith("parallax/"));
const bytes = keys.reduce((n, o) => n + o.size, 0);
console.log(`${rows.length} capa(s) com parallax no banco; ${keys.length} arquivo(s) em parallax/ no S3 (${(bytes / 1e6).toFixed(1)} MB)`);
for (const r of rows) console.log(" -", r.url.split("/").pop(), "|", r.step);
if (!yes) {
  console.log("\nSimulação: nada foi apagado. Rode com --yes para apagar.");
  process.exit(0);
}
let failed = 0;
for (const o of keys) {
  try {
    await deleteObject(o.key);
  } catch (e) {
    failed++;
    console.error("falhou", o.key, String(e).split("\n")[0].slice(0, 100));
  }
}
if (failed) {
  console.error(`${failed} arquivo(s) não foram apagados; o banco NÃO foi alterado. Rode de novo quando o S3 responder.`);
  process.exit(1);
}
await db.update(coverParallax).set({ config: null, status: "done", step: null }).where(isNotNull(coverParallax.config));
console.log("Pronto. Camadas removidas; cores de destaque mantidas. As páginas em cache atualizam em até 15 min (ou reinicie o servidor).");
process.exit(0);
