"use client";

import { AlertCircle, Loader2 } from "lucide-react";

import { useDevices } from "@/hooks/use-devices";

import { DeviceCard } from "./device-card";

export function DeviceList() {
  const { data, isPending, isError, error, refetch } = useDevices();

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        기기를 불러오는 중...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <p className="text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "기기 목록을 불러오지 못했습니다."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm font-medium text-primary hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        등록된 기기가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((device) => (
        <DeviceCard key={device.nodeId} device={device} />
      ))}
    </div>
  );
}
