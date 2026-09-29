import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DeviceTileState = "on" | "off" | "offline";

type Props = {
  state: DeviceTileState;
  /** 좌상단 아이콘 박스에 들어갈 lucide 아이콘 */
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** 우상단 액션. 전원 버튼 + 보조 1개까지 */
  actions?: ReactNode;
  /** 하단 대형 수치 (TileValue) */
  value?: ReactNode;
  /** 상세 페이지 링크. 하단 행 맨 오른쪽에 화살표 아이콘 버튼으로 표시된다 */
  href?: string;
  /** href 링크의 접근성 이름 */
  linkLabel?: string;
  /** 본문 아래 추가 행 (측정값 등) */
  children?: ReactNode;
  /** 구분선 아래 하단 행 (메인 표시 설정 등). href 화살표와 같은 줄에 놓인다 */
  footer?: ReactNode;
  className?: string;
};

// 메인·기기관리 공용 디바이스 타일. 색이 곧 상태 — 켜짐만 네이비 틴트 + 네이비 테두리, 오프라인은 점선.
// data-state를 노출해 자식(EnergyStats 등)이 group-data-[state=on]으로 톤을 맞출 수 있다.
export function DeviceTile({
  state,
  icon,
  title,
  subtitle,
  actions,
  value,
  href,
  linkLabel,
  children,
  footer,
  className,
}: Props) {
  return (
    <Card
      data-state={state}
      className={cn(
        "group flex min-h-40 flex-col gap-3 p-4 transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-md",
        state === "on" && "border-secondary bg-accent-soft",
        state === "offline" && "border-dashed",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-5",
            state === "on" && "bg-secondary text-secondary-foreground",
            state === "offline" && "text-muted-foreground",
          )}
        >
          {icon}
        </span>
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
      <div className="mt-auto min-w-0">
        <div
          className={cn(
            "truncate font-semibold",
            state === "offline" && "text-muted-foreground",
          )}
        >
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {subtitle}
          </div>
        )}
        {value && (
          <p className="mt-2 flex items-baseline gap-1 text-2xl font-bold tracking-[-.02em] tabular-nums">
            {value}
          </p>
        )}
      </div>
      {children}
      {(footer || href) && (
        <div className="flex items-center gap-2 border-t border-border pt-3">
          {footer && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {footer}
            </div>
          )}
          {href && (
            <Link
              href={href}
              aria-label={linkLabel ?? "상세 보기"}
              className={buttonClassName({
                variant: "outline",
                size: "icon-sm",
                className: "ml-auto",
              })}
            >
              <ChevronRight />
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}

// 타일 하단 수치 + 작은 단위 (예: 128 W)
export function TileValue({ value, unit }: { value: string; unit?: string }) {
  return (
    <>
      {value}
      {unit && (
        <span className="text-sm font-medium tracking-normal text-muted-foreground">
          {unit}
        </span>
      )}
    </>
  );
}
