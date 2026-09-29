import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

// 11px 대문자 라벨. 대형 수치 위에 붙여 위계 대비를 만든다. (DESIGN.md 무브 ⑪)
export function Eyebrow({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "block text-[11px] font-semibold tracking-[.08em] text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

type StatProps = {
  label: string;
  /** 수치 부분 (예: "3.42") */
  value: string;
  /** 단위 (예: "kWh"). muted·작은 크기로 분리 표시 */
  unit?: string;
  /** 대표 수치(44px)면 true, 보조 수치(26px)면 false */
  emphasis?: boolean;
  /** 아래 보조 문구 (증감·비중 등) */
  sub?: ReactNode;
  className?: string;
};

// 화면에 44px 대표 수치는 1곳만. 값이 없으면 "—"로 넘긴다.
export function Stat({ label, value, unit, emphasis, sub, className }: StatProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Eyebrow>{label}</Eyebrow>
      <p
        className={cn(
          "m-0 truncate font-bold tabular-nums",
          emphasis
            ? "text-4xl tracking-[-.03em]"
            : "text-2xl tracking-[-.02em]",
        )}
      >
        {value}
        {unit && (
          <span
            className={cn(
              "ml-1 font-medium tracking-normal text-muted-foreground",
              emphasis ? "text-lg" : "text-sm",
            )}
          >
            {unit}
          </span>
        )}
      </p>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
