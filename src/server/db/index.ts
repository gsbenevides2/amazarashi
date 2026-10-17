import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql/postgres";
import { instrumentDb } from "../../instrumentation/instrumentDb";

const url = process.env.DATABASE_URL!;
// O build prerenderiza 500+ páginas em vários workers, cada um com seu pool: no pgbouncer isso estoura max_client_conn.
const max = process.env.NEXT_PHASE === "phase-production-build" ? 1 : undefined;

export const db = drizzle({ client: instrumentDb(new SQL(url, { max }), url) });
