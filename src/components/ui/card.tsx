import * as React from "react";

import { cn } from "@/lib/utils";

// 위젯 카드: 테두리·그림자 없이 검은 배경과의 톤 차이로만 구분한다.
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[22px] bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}
