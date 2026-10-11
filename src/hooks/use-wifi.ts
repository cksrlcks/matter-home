"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { WifiCredentialsDto } from "@/types/matter";

export const wifiKeys = {
  all: ["matter-wifi"] as const,
};

async function fetchWifi(): Promise<WifiCredentialsDto> {
  const res = await fetch("/api/matter/wifi");
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Wi-Fi 설정을 불러오지 못했습니다.");
  }
  return res.json();
}

// 설정 다이얼로그가 열려 있을 때만 조회한다.
export function useWifi(enabled: boolean) {
  return useQuery({
    queryKey: wifiKeys.all,
    queryFn: fetchWifi,
    enabled,
    retry: false,
  });
}

type WifiVariables = { ssid: string; password: string };

async function saveWifi(variables: WifiVariables) {
  const res = await fetch("/api/matter/wifi", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(variables),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "Wi-Fi 저장에 실패했습니다.");
  }
  return data;
}

async function removeWifi() {
  const res = await fetch("/api/matter/wifi", { method: "DELETE" });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "Wi-Fi 삭제에 실패했습니다.");
  }
  return data;
}

export function useSaveWifi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveWifi,
    onSuccess: (_data, { ssid }) => {
      queryClient.setQueryData<WifiCredentialsDto>(wifiKeys.all, { ssid });
    },
  });
}

export function useRemoveWifi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeWifi,
    onSuccess: () => {
      queryClient.setQueryData<WifiCredentialsDto>(wifiKeys.all, { ssid: null });
    },
  });
}
