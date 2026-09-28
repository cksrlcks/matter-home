import { Zap } from "lucide-react";

import { formatAmps, formatKwh, formatVolts, formatWatts } from "@/lib/energy";
import { cn } from "@/lib/utils";
import type { DeviceEnergyDto } from "@/types/matter";

type Props = {
  energy: DeviceEnergyDto;
  online: boolean;
  className?: string;
};

// 기기 카드 안에 표시하는 플러그 단위 측정값
export function EnergyStats({ energy, online, className }: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 rounded-lg bg-muted px-4 py-3",
        !online && "opacity-60",
        className,
      )}
    >
      <div className="col-span-3 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5" />
          현재 소비전력
        </span>
        <span className="text-xl font-bold tabular-nums">
          {formatWatts(online ? energy.activePowerW : null)}
        </span>
      </div>
      <Stat label="전압" value={formatVolts(energy.voltageV)} />
      <Stat label="전류" value={formatAmps(energy.currentA)} />
      <Stat label="누적" value={formatKwh(energy.cumulativeKwh)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}
