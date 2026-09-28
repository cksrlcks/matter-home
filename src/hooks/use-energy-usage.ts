"use client";

import { useQuery } from "@tanstack/react-query";

import type { EnergyUsageDto } from "@/types/matter";

export const energyKeys = {
  all: ["energy"] as const,
  usage: () => [...energyKeys.all, "usage"] as const,
};

async function fetchEnergyUsage(): Promise<EnergyUsageDto> {
  const res = await fetch("/api/energy/usage");
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "전력 사용량을 불러오지 못했습니다.");
  }
  return res.json();
}

// 샘플은 5분 주기로 쌓이므로 1분 간격이면 충분하다.
export function useEnergyUsage() {
  return useQuery({
    queryKey: energyKeys.usage(),
    queryFn: fetchEnergyUsage,
    refetchInterval: 60_000,
  });
}
