"use client";

import { useState } from "react";

import { formatKwh } from "@/lib/energy";
import { cn } from "@/lib/utils";
import type { DailyEnergyDto } from "@/types/matter";

type Props = {
  daily: DailyEnergyDto[];
  pricePerKwh: number;
  className?: string;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dateLabel(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${WEEKDAYS[d.getUTCDay()]})`;
}

// 최근 30일 일별 사용량 막대 차트. 오늘은 진행 중이라 옅게 표시한다.
export function DailyEnergyChart({ daily, pricePerKwh, className }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...daily.map((d) => d.kwh), 0);
  const lastIndex = daily.length - 1;
  const active = hovered ?? lastIndex;
  const activeDay = daily[active];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">최근 30일 일별 사용량</h3>
        {activeDay && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {dateLabel(activeDay.date)}
            {active === lastIndex && " · 오늘"}
            <span className="ml-2 text-sm font-semibold text-foreground">
              {formatKwh(activeDay.kwh)}
            </span>
            <span className="ml-1.5">
              약 {Math.round(activeDay.kwh * pricePerKwh).toLocaleString()}원
            </span>
          </p>
        )}
      </div>

      <div
        className="flex h-32 items-end gap-0.5 border-b border-border"
        onMouseLeave={() => setHovered(null)}
      >
        {daily.map((day, i) => {
          const height = max > 0 ? (day.kwh / max) * 100 : 0;
          return (
            <button
              key={day.date}
              type="button"
              aria-label={`${dateLabel(day.date)} ${formatKwh(day.kwh)}`}
              onMouseEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onClick={() => setHovered(i)}
              className="group flex h-full min-w-0 flex-1 items-end focus:outline-none"
            >
              <span
                className={cn(
                  "block w-full rounded-t transition-[height,opacity] duration-300",
                  i === lastIndex ? "bg-primary/45" : "bg-primary",
                  hovered !== null && hovered !== i && "opacity-40",
                )}
                // 0이 아닌 값은 최소 2px로 보이게 한다.
                style={{
                  height: day.kwh > 0 ? `max(${height}%, 2px)` : "0",
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{daily[0] && dateLabel(daily[0].date)}</span>
        <span>
          최대 {formatKwh(max)}
        </span>
        <span>오늘</span>
      </div>
    </div>
  );
}
