import { formatAmps, formatKwh, formatVolts } from "@/lib/energy";
import { cn } from "@/lib/utils";
import type { DeviceEnergyDto } from "@/types/matter";

type Props = {
  energy: DeviceEnergyDto;
  online: boolean;
  className?: string;
};

// 기기 타일 안의 플러그 측정값 행 (전압 · 전류 · 누적). 현재 전력은 타일 수치가 보여준다.
// 켜짐 타일(네이비 틴트) 안에서는 반투명 흰 패널로 톤을 맞춘다.
export function EnergyStats({ energy, online, className }: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 rounded-xl bg-muted px-4 py-3 group-data-[state=on]:bg-card/70",
        !online && "opacity-60",
        className,
      )}
    >
      <Cell label="전압" value={formatVolts(energy.voltageV)} />
      <Cell label="전류" value={formatAmps(energy.currentA)} />
      <Cell label="누적" value={formatKwh(energy.cumulativeKwh)} />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
