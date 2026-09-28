import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Postgres 연결/드리즐 인스턴스를 한 번만 만든다. (dev HMR 대비 globalThis 캐시)
type DbStore = {
  client: ReturnType<typeof postgres>;
  db: PostgresJsDatabase<typeof schema>;
};

const globalForDb = globalThis as unknown as { __db?: DbStore };

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (globalForDb.__db) return globalForDb.__db.db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
  }

  const client = postgres(url, { max: 5 });
  const db = drizzle(client, { schema });
  globalForDb.__db = { client, db };
  return db;
}
