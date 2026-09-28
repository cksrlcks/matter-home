import "server-only";

import { insertEnergySamples } from "@/lib/db/energy-samples";

import { getEnergyReadings } from "./devices";

// 누적 전력량을 주기적으로 DB에 스냅샷한다. 오늘/이번 달 사용량 계산의 원천 데이터.
// ENERGY_SAMPLE_INTERVAL_SEC=0 이면 비활성화 (예: dev PC가 prod와 같은 DB를 볼 때).
const DEFAULT_INTERVAL_SEC = 300;

const globalForSampler = globalThis as unknown as {
  __energySampler?: ReturnType<typeof setInterval>;
};

async function sampleOnce(): Promise<void> {
  try {
    const readings = await getEnergyReadings();
    if (readings.length === 0) return;
    await insertEnergySamples(readings);
  } catch (error) {
    // Matter Server/DB가 잠깐 죽어도 다음 주기에 다시 시도한다.
    console.error("[energy] 샘플 기록 실패:", error);
  }
}

export function startEnergySampler(): void {
  if (!process.env.DATABASE_URL) {
    console.warn("[energy] DATABASE_URL 미설정 — 전력량 기록을 건너뜁니다.");
    return;
  }

  const raw = process.env.ENERGY_SAMPLE_INTERVAL_SEC;
  const intervalSec = raw === undefined ? DEFAULT_INTERVAL_SEC : Number(raw);
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
    console.log("[energy] 전력량 기록 비활성화");
    return;
  }

  // dev HMR/중복 register 호출에도 타이머는 하나만 유지한다.
  if (globalForSampler.__energySampler) {
    clearInterval(globalForSampler.__energySampler);
  }

  // 기동 직후엔 Matter Server 구독이 채워지기 전일 수 있어 첫 샘플을 조금 늦춘다.
  setTimeout(sampleOnce, 15_000);
  globalForSampler.__energySampler = setInterval(
    sampleOnce,
    intervalSec * 1000,
  );
  console.log(`[energy] 전력량 기록 시작 (${intervalSec}초 주기)`);
}
