"use client";

import { TileSkeleton } from "@/components/ui/skeleton";
import { useDevices } from "@/hooks/use-devices";

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
    return <TileSkeleton className={className} />;
  }

  const device = data?.find((d) => d.nodeId === nodeId);
  if (!device) {
    return (
      <UnavailableDeviceCard
        source="matter"
        deviceId={nodeId}
        message={
          isError
            ? "Matter 기기를 불러오지 못했습니다."
            : "등록되지 않은 Matter 기기입니다."
        }
        className={className}
      />
    );
  }

  return <DeviceCard device={device} className={className} />;
}
