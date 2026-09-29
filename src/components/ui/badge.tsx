import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "online"
  | "on"
  | "live"
  | "warn"
  | "info"
  | "plain";

const VARIANT: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  online: "bg-success/15 text-success",
  on: "bg-accent-soft text-foreground [&>i]:bg-secondary",
  live: "bg-danger/12 text-danger",
  warn: "bg-warning/15 text-warning",
  info: "bg-info/12 text-info",
  // 소스 라벨(Matter · SmartThings) 등 상태가 아닌 것은 점 없이
  plain: "bg-muted text-muted-foreground",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

// 상태 뱃지: 뱃지 1개 = 상태 1개. 클릭 가능한 요소로 쓰지 않는다.
export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs leading-none font-medium",
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {variant !== "plain" && (
        <i aria-hidden className="size-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
