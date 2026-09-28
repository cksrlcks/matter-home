// Next.js 서버 기동 훅. Node 런타임에서만 DB 마이그레이션을 자동 실행한다.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runMigrations } = await import("@/lib/db/migrate");
  await runMigrations();
}
