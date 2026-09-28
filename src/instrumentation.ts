// Next.js 서버 기동 훅. Node 런타임에서만 DB 마이그레이션과 전력량 기록을 시작한다.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // 외부 환경(로컬 네트워크 밖)에서는 DB/Matter 서버에 닿지 않으므로 건너뛴다.
  if (process.env.EXTERNAL_MODE === "true") return;
  const { runMigrations } = await import("@/lib/db/migrate");
  await runMigrations();

  const { startEnergySampler } = await import("@/lib/matter/energy-sampler");
  startEnergySampler();
}
