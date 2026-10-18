import { sql } from "drizzle-orm";
import { db } from "../../db";
import { deleteObject, listObjects, publicUrl } from "../../s3";

// Upload recente pode ainda não estar salvo no formulário do admin; não conta como órfão.
const GRACE_MS = 60 * 60 * 1000;

export abstract class Storage {
  // Órfão = objeto do bucket cuja chave não aparece em nenhuma coluna de texto do banco (varre todas, então colunas novas entram sozinhas).
  static async orphans() {
    const cols = await db.execute<{ t: string; c: string }>(sql`select table_name t, column_name c from information_schema.columns where table_schema = 'public' and data_type in ('text', 'character varying')`);
    const union = sql.join(cols.map(({ t, c }) => sql`select ${sql.identifier(c)}::text v from ${sql.identifier(t)}`), sql` union all `);
    const rows = await db.execute<{ v: string | null }>(union);
    const blob = rows.map((r) => r.v ?? "").join("\n");
    const limit = Date.now() - GRACE_MS;
    return (await listObjects())
      .filter((o) => o.modified.getTime() < limit && !blob.includes(o.key))
      .sort((a, b) => b.size - a.size)
      .map((o) => ({ key: o.key, size: o.size, modified: o.modified.toISOString(), url: publicUrl(o.key) }));
  }

  // Recalcula os órfãos: só apaga o que foi pedido E continua órfão.
  static async remove(keys: string[]) {
    const wanted = new Set(keys);
    const doomed = (await Storage.orphans()).filter((o) => wanted.has(o.key));
    await Promise.all(doomed.map((o) => deleteObject(o.key)));
    return doomed.length;
  }
}
