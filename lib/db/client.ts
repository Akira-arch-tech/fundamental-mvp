import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import { isDatabaseEnabled } from "@/lib/runtime";

export type DrizzleDb = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  fdmSql?: ReturnType<typeof postgres>;
  fdmDb?: DrizzleDb;
};

export function getDb(): DrizzleDb | null {
  if (!isDatabaseEnabled()) return null;
  const url = process.env.DATABASE_URL!.trim();
  if (!globalForDb.fdmSql) {
    globalForDb.fdmSql = postgres(url, { max: 10 });
  }
  if (!globalForDb.fdmDb) {
    globalForDb.fdmDb = drizzle(globalForDb.fdmSql, { schema });
  }
  return globalForDb.fdmDb;
}
