import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("block animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  );
}

// DeviceTile 모양 그대로의 스켈레톤 — 로딩이 끝나도 레이아웃이 흔들리지 않는다.
export function TileSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-busy="true"
      className={cn("flex min-h-40 flex-col gap-3 p-4", className)}
    >
      <div className="flex justify-between">
        <Skeleton className="size-10" />
        <Skeleton className="size-10 rounded-full" />
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-2.5 w-2/5" />
      </div>
    </Card>
  );
}

type TileGridSkeletonProps = {
  count?: number;
  className?: string;
};

export function TileGridSkeleton({
  count = 6,
  className,
}: TileGridSkeletonProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 md:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <TileSkeleton key={i} />
      ))}
    </div>
  );
}
