import "server-only";

import { sql } from "drizzle-orm";

import type { DailyEnergyDto, EnergyUsageDto } from "@/types/matter";

import { getDb } from "./index";
import { energySamples } from "./schema";

// 일/월 경계는 한국 시간 기준. (서버·DB timezone 설정과 무관하게 고정)
const APP_TIMEZONE = "Asia/Seoul";
// 주택용 저압 1단계(120원) + 기후환경(9) + 연료비조정(5) → 부가세·전력기금 포함 약 150원
const DEFAULT_PRICE_PER_KWH = 150;
const DAILY_DAYS = 30;
// 이보다 짧은 기록으로는 월 사용량을 추정하지 않는다.
const MIN_PROJECTION_MS = 6 * 60 * 60 * 1000;

function pricePerKwh(): number {
  const n = Number(process.env.ELECTRICITY_PRICE_PER_KWH);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PRICE_PER_KWH;
}

export async function insertEnergySamples(
  readings: { nodeId: string; cumulativeKwh: number; activePowerW: number | null }[],
): Promise<void> {
  const db = getDb();
  await db.insert(energySamples).values(readings);
}

// "YYYY-MM-DD" (timezone 기준)
function localDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

function shiftDate(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type DailyRow = { node_id: string; day: string; kwh: number };
type BoundsRow = { month_start: Date; month_end: Date; since: Date | null };

export async function getEnergyUsage(): Promise<EnergyUsageDto> {
  const db = getDb();
  const tz = APP_TIMEZONE;

  // 연속 샘플 간 증가분(delta)을 뒤쪽 샘플의 날짜에 귀속시켜 합산한다.
  // - 누적값이 줄었으면 플러그 재부팅 등으로 카운터가 리셋된 것 → 새 값 전체를 증가분으로 본다.
  // - 기간 시작 직전 샘플도 기준점으로 쓰도록 1일 여유를 두고 읽는다.
  // - dev/prod 두 샘플러가 같은 DB에 써도 누적값 차이 합이라 이중 집계되지 않는다.
  const daily = await db.execute<DailyRow>(sql`
    with bounds as (
      select least(
        date_trunc('month', now() at time zone ${tz}),
        date_trunc('day', now() at time zone ${tz}) - make_interval(days => ${DAILY_DAYS - 1})
      ) at time zone ${tz} as range_start
    ),
    s as (
      select node_id, recorded_at, cumulative_kwh,
        lag(cumulative_kwh) over (partition by node_id order by recorded_at) as prev
      from energy_samples, bounds
      where recorded_at >= bounds.range_start - interval '1 day'
    )
    select node_id,
      to_char(recorded_at at time zone ${tz}, 'YYYY-MM-DD') as day,
      sum(case
        when prev is null then 0
        when cumulative_kwh >= prev then cumulative_kwh - prev
        else cumulative_kwh
      end)::double precision as kwh
    from s, bounds
    where recorded_at >= bounds.range_start
    group by node_id, day
  `);

  const [bounds] = await db.execute<BoundsRow>(sql`
    select
      date_trunc('month', now() at time zone ${tz}) at time zone ${tz} as month_start,
      (date_trunc('month', now() at time zone ${tz}) + interval '1 month') at time zone ${tz} as month_end,
      (select min(recorded_at) from energy_samples) as since
  `);

  const now = new Date();
  const today = localDate(now, tz);
  const monthPrefix = today.slice(0, 8); // "YYYY-MM-"

  const byNode = new Map<string, { todayKwh: number; monthKwh: number }>();
  const byDay = new Map<string, number>();
  for (const row of daily) {
    const kwh = Number(row.kwh) || 0;
    const entry = byNode.get(row.node_id) ?? { todayKwh: 0, monthKwh: 0 };
    if (row.day === today) entry.todayKwh += kwh;
    if (row.day.startsWith(monthPrefix)) entry.monthKwh += kwh;
    byNode.set(row.node_id, entry);
    byDay.set(row.day, (byDay.get(row.day) ?? 0) + kwh);
  }

  const devices = [...byNode].map(([nodeId, usage]) => ({ nodeId, ...usage }));
  const todayKwh = devices.reduce((sum, d) => sum + d.todayKwh, 0);
  const monthKwh = devices.reduce((sum, d) => sum + d.monthKwh, 0);

  const dailySeries: DailyEnergyDto[] = [];
  for (let i = DAILY_DAYS - 1; i >= 0; i--) {
    const date = shiftDate(today, -i);
    dailySeries.push({ date, kwh: byDay.get(date) ?? 0 });
  }

  // 기록이 월 중간에 시작됐으면 기록 시작 시점부터의 사용 속도로 추정한다.
  const since = bounds?.since ? new Date(bounds.since) : null;
  let projectedMonthKwh: number | null = null;
  if (bounds && since) {
    const start = Math.max(new Date(bounds.month_start).getTime(), since.getTime());
    const elapsed = now.getTime() - start;
    const remaining = new Date(bounds.month_end).getTime() - now.getTime();
    if (elapsed >= MIN_PROJECTION_MS) {
      projectedMonthKwh = monthKwh + (monthKwh / elapsed) * Math.max(remaining, 0);
    }
  }

  return {
    timezone: tz,
    pricePerKwh: pricePerKwh(),
    since: since?.toISOString() ?? null,
    todayKwh,
    monthKwh,
    projectedMonthKwh,
    devices,
    daily: dailySeries,
  };
}
