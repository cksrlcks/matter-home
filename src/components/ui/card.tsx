import * as React from "react";

import { cn } from "@/lib/utils";

// 기본 상태는 그림자 없이 1px 선 + 배경 톤(오프화이트 ↔ 순백)으로만 구분한다.
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}
