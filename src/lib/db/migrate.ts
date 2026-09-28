import "server-only";

import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// 서버 기동 시 자동 마이그레이션. drizzle/ 폴더의 SQL을 적용한다.
// DB가 잠깐 안 떠 있어도 앱 자체는 뜨도록 실패를 삼킨다(기기 목록/제어는 계속 동작).
export async function runMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[db] DATABASE_URL 미설정 — 마이그레이션을 건너뜁니다.");
    return;
  }

  const migrationClient = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    console.log("[db] 마이그레이션 완료");
  } catch (error) {
    console.error("[db] 마이그레이션 실패:", error);
  } finally {
    await migrationClient.end();
  }
}
