"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { useDevices } from "@/hooks/use-devices";
import { useEnergyUsage } from "@/hooks/use-energy-usage";
import { formatKwh, formatWatts, splitUnit } from "@/lib/energy";
import { cn } from "@/lib/utils";
import type { DeviceDto, DeviceEnergyDto } from "@/types/matter";

import { DailyEnergyChart } from "./daily-energy-chart";

type MeteredDevice = DeviceDto & { energy: DeviceEnergyDto };

type Props = {
  className?: string;
};

function formatWon(value: number): string {
  return `약 ${Math.round(value).toLocaleString()}원`;
}

function formatSince(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// 오늘 사용량 링. 평소(기록이 있는 지난 날들의 평균) 대비 얼마나 썼는지를 채운다.
function Ring({ progress }: { progress: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * Math.min(Math.max(progress, 0), 1);
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className="size-12 shrink-0 -rotate-90 text-tile-light"
    >
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity=".22"
        strokeWidth="7"
      />
      {/* 0이면 둥근 끝(linecap)만 점으로 남으므로 그리지 않는다. */}
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        visibility={filled > 0 ? "visible" : "hidden"}
        strokeDasharray={`${filled} ${circumference}`}
        className="transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}

// 전력 측정을 지원하는 모든 플러그의 합산 + 기간별 사용량 + 플러그별 비중.
// 실시간 W는 useDevices(3초), 기간 사용량은 useEnergyUsage(1분)에서 온다.
export function EnergySummary({ className }: Props) {
  const [open, setOpen] = useState(false);
  const { data } = useDevices();
  const { data: usage } = useEnergyUsage();

  const metered = (data ?? []).filter(
    (device): device is MeteredDevice => device.energy !== null,
  );
  if (metered.length === 0) return null;

  // 오프라인 기기의 마지막 캐시값은 현재 소비로 보지 않는다.
  const livePower = (device: MeteredDevice) =>
    device.online ? (device.energy.activePowerW ?? 0) : 0;

  const totalW = metered.reduce((sum, d) => sum + livePower(d), 0);
  const activeCount = metered.filter((d) => livePower(d) > 0).length;
  const ranked = [...metered].sort((a, b) => livePower(b) - livePower(a));

  const usageByNode = new Map(usage?.devices.map((d) => [d.nodeId, d]));
  const price = usage?.pricePerKwh ?? 0;

  // 수치와 단위를 분리해 Stat에 넘긴다. 값이 없으면 "—"
  const NONE: [string, string] = ["—", ""];
  const watts = splitUnit(formatWatts(totalW));
  const today = usage ? splitUnit(formatKwh(usage.todayKwh)) : NONE;
  const month = usage ? splitUnit(formatKwh(usage.monthKwh)) : NONE;

  // 평소 하루 사용량: 오늘(마지막 칸)을 뺀, 기록이 있는 날들의 평균.
  const pastDays = (usage?.daily.slice(0, -1) ?? []).filter((d) => d.kwh > 0);
  const usualKwh =
    pastDays.length > 0
      ? pastDays.reduce((sum, d) => sum + d.kwh, 0) / pastDays.length
      : null;
  const todayRatio = usage && usualKwh ? usage.todayKwh / usualKwh : null;

  return (
    <Card className={cn("mb-6", className)}>
      <h2>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="energy-summary-panel"
          className="flex w-full items-center gap-4 rounded-[22px] p-5 text-left"
        >
          <Ring progress={todayRatio ?? 0} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] leading-tight font-bold">
              오늘 전력
            </span>
            <span className="mt-0.5 flex items-baseline gap-1 text-tile-light tabular-nums">
              <span className="text-2xl font-bold">{today[0]}</span>
              <span className="text-sm font-semibold">{today[1]}</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-right text-xs text-muted-foreground tabular-nums">
              <span className="block text-sm font-semibold text-foreground">
                {formatWatts(totalW)}
              </span>
              {todayRatio !== null
                ? `평소의 ${Math.round(todayRatio * 100)}%`
                : "지금 사용 중"}
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </span>
        </button>
      </h2>

      {open && (
        <div
          id="energy-summary-panel"
          className="flex flex-col gap-5 px-5 pb-5"
        >
          {usage?.since && (
            <p className="-mt-3 text-xs text-muted-foreground">
              {formatSince(usage.since)}부터 기록
            </p>
          )}

          {/* 대표 수치(44px)는 현재 소비전력 1곳만, 나머지는 26px */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-4">
            <Stat
              label="현재 소비전력"
              value={watts[0]}
              unit={watts[1]}
              emphasis
              sub={`플러그 ${activeCount} / ${metered.length}개 사용 중`}
            />
            <Stat
              label="오늘"
              value={today[0]}
              unit={today[1]}
              sub={usage ? formatWon(usage.todayKwh * price) : undefined}
            />
            <Stat
              label="이번 달"
              value={month[0]}
              unit={month[1]}
              sub={usage ? formatWon(usage.monthKwh * price) : undefined}
            />
            <Stat
              label="이번 달 예상"
              value={
                usage?.projectedMonthKwh != null
                  ? formatWon(usage.projectedMonthKwh * price)
                  : "—"
              }
              sub={
                usage?.projectedMonthKwh != null
                  ? formatKwh(usage.projectedMonthKwh)
                  : "기록이 더 쌓이면 표시"
              }
            />
          </div>

          {usage && (
            <DailyEnergyChart daily={usage.daily} pricePerKwh={price} />
          )}

          <ul className="flex flex-col gap-3">
            {ranked.map((device) => {
              const watts = livePower(device);
              const share = totalW > 0 ? (watts / totalW) * 100 : 0;
              const deviceUsage = usageByNode.get(device.nodeId);
              return (
                <li key={device.nodeId} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span
                      className={cn(
                        "min-w-0 truncate font-medium",
                        !device.online && "text-muted-foreground",
                      )}
                    >
                      {device.name}
                      {!device.online && (
                        <span className="ml-1.5 text-xs font-normal">
                          (오프라인)
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="mr-2 text-xs text-muted-foreground">
                        오늘 {formatKwh(deviceUsage?.todayKwh ?? 0)}
                      </span>
                      <span className="font-semibold">
                        {device.online ? formatWatts(watts) : "-"}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {usage && (
            <p className="text-xs text-muted-foreground">
              요금은 {price.toLocaleString()}원/kWh 단가로 계산한 추정치이며,
              플러그에 연결된 기기만 포함합니다.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

