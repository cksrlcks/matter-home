import * as React from "react";

import { cn } from "@/lib/utils";

// 스티커 카드: 잉크 외곽선 + 딱 떨어지는 그림자.
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticker rounded-3xl bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}
