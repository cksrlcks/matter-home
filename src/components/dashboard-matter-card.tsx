"use client";

import { Card } from "@/components/ui/card";
import { useDevices } from "@/hooks/use-devices";
import { cn } from "@/lib/utils";

import { DeviceCard } from "./device-card";
import { UnavailableDeviceCard } from "./unavailable-device-card";

type Props = {
  nodeId: string;
  className?: string;
};

// 메인 화면의 Matter 기기 카드. 목록 쿼리(3초 폴링)를 모든 카드가 공유한다.
export function DashboardMatterCard({ nodeId, className }: Props) {
  const { data, isPending, isError } = useDevices();

  if (isPending) {
    // 타일 모양 그대로의 스켈레톤 — 레이아웃이 흔들리지 않는다.
    return (
      <Card
        aria-busy="true"
        className={cn("flex min-h-40 flex-col gap-3 p-4", className)}
      >
        <div className="flex justify-between">
          <span className="size-10 animate-pulse rounded-lg bg-muted" />
          <span className="size-10 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <span className="h-3.5 w-3/5 animate-pulse rounded-lg bg-muted" />
          <span className="h-2.5 w-2/5 animate-pulse rounded-lg bg-muted" />
        </div>
      </Card>
    );
  }

  const device = data?.find((d) => d.nodeId === nodeId);
  if (!device) {
    return (
      <UnavailableDeviceCard
        source="matter"
        deviceId={nodeId}
        message={
          isError ? "Matter 기기를 불러오지 못했습니다." : "등록되지 않은 Matter 기기입니다."
        }
        className={className}
      />
    );
  }

  return <DeviceCard device={device} className={className} />;
}
