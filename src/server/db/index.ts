import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql/postgres";
import { instrumentDb } from "../../instrumentation/instrumentDb";

const url = process.env.DATABASE_URL!;

export const db = drizzle({ client: instrumentDb(new SQL(url), url) });
