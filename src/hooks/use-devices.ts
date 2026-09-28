"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { CommissionableDeviceDto, DeviceDto } from "@/types/matter";

export const deviceKeys = {
  all: ["devices"] as const,
  list: () => [...deviceKeys.all, "list"] as const,
  discover: () => [...deviceKeys.all, "discover"] as const,
};

// 기기 상태는 명령 직후 바로 반영되지 않고, attribute_updated 이벤트로 뒤늦게
// 올라온다. 그동안 폴링/refetch가 아직 안 바뀐 서버값을 덮어써서 토글이 깜빡인다.
// 사용자가 누른 값(desired)을 서버값이 따라잡을 때까지(또는 TTL) 유지해 깜빡임을 막는다.
const PENDING_POWER_TTL = 8000;
const pendingPower = new Map<string, { desired: boolean; at: number }>();

function overlayPendingPower(devices: DeviceDto[]): DeviceDto[] {
  if (pendingPower.size === 0) return devices;
  const now = Date.now();
  return devices.map((device) => {
    const pending = pendingPower.get(device.nodeId);
    if (!pending || !device.power) return device;
    // 서버가 따라잡았거나 TTL 초과 → 낙관값 폐기하고 서버값을 신뢰
    if (device.power.on === pending.desired || now - pending.at > PENDING_POWER_TTL) {
      pendingPower.delete(device.nodeId);
      return device;
    }
    return { ...device, power: { ...device.power, on: pending.desired, pending: true } };
  });
}

async function fetchDevices(): Promise<DeviceDto[]> {
  const res = await fetch("/api/devices");
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "기기 목록을 불러오지 못했습니다.");
  }
  return res.json();
}

export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: fetchDevices,
    refetchInterval: 3000, // 상태 자동 갱신 (polling)
    // 폴링/refetch가 아직 안 바뀐 서버값으로 낙관값을 덮어쓰지 않도록 유지
    select: overlayPendingPower,
  });
}

type PowerVariables = { nodeId: string; state: boolean };

async function updatePower({ nodeId, state }: PowerVariables) {
  const res = await fetch(`/api/devices/${nodeId}/power`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "기기 제어에 실패했습니다.");
  }
  return data;
}

type RenameVariables = { nodeId: string; name: string };

async function renameDevice({ nodeId, name }: RenameVariables) {
  const res = await fetch(`/api/devices/${nodeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "이름 변경에 실패했습니다.");
  }
  return data;
}

async function resetDeviceName(nodeId: string) {
  const res = await fetch(`/api/devices/${nodeId}`, { method: "DELETE" });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "초기화에 실패했습니다.");
  }
  return data;
}

export function useRenameDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: renameDevice,
    onMutate: async ({ nodeId, name }) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.list() });
      const previous = queryClient.getQueryData<DeviceDto[]>(deviceKeys.list());
      queryClient.setQueryData<DeviceDto[]>(deviceKeys.list(), (old) =>
        old?.map((device) =>
          device.nodeId === nodeId
            ? { ...device, name, customName: name }
            : device,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(deviceKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}

export function useResetDeviceName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetDeviceName,
    onMutate: async (nodeId: string) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.list() });
      const previous = queryClient.getQueryData<DeviceDto[]>(deviceKeys.list());
      queryClient.setQueryData<DeviceDto[]>(deviceKeys.list(), (old) =>
        old?.map((device) =>
          device.nodeId === nodeId
            ? { ...device, name: device.matterName, customName: null }
            : device,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(deviceKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}

async function discoverDevices(): Promise<CommissionableDeviceDto[]> {
  const res = await fetch("/api/devices/discover");
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "기기 검색에 실패했습니다.");
  }
  return res.json();
}

// 주변 commissionable 기기 검색. 스캔은 비싸므로 사용자가 버튼을 눌렀을 때만
// refetch()로 실행한다. (자동 실행/폴링/재시도 없음)
export function useDiscoverDevices() {
  return useQuery({
    queryKey: deviceKeys.discover(),
    queryFn: discoverDevices,
    enabled: false,
    retry: false,
    gcTime: 0,
  });
}

async function commissionDevice(code: string): Promise<DeviceDto> {
  const res = await fetch("/api/devices/commission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    device?: DeviceDto;
  };
  if (!res.ok || !data.success || !data.device) {
    throw new Error(data.message ?? "기기 추가에 실패했습니다.");
  }
  return data.device;
}

async function removeDevice(nodeId: string) {
  const res = await fetch(`/api/devices/${nodeId}/remove`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "기기 제거에 실패했습니다.");
  }
  return data;
}

export function useCommissionDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: commissionDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}

export function useRemoveDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeDevice,
    // optimistic: 목록에서 즉시 제거
    onMutate: async (nodeId: string) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.list() });
      const previous = queryClient.getQueryData<DeviceDto[]>(deviceKeys.list());
      queryClient.setQueryData<DeviceDto[]>(deviceKeys.list(), (old) =>
        old?.filter((device) => device.nodeId !== nodeId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(deviceKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}

export function usePowerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePower,
    // optimistic update
    onMutate: async ({ nodeId, state }) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.list() });
      const previous = queryClient.getQueryData<DeviceDto[]>(deviceKeys.list());
      // 누른 값을 서버가 따라잡을 때까지 유지 → 늦게 오는 stale 폴링에도 안 밀림
      pendingPower.set(nodeId, { desired: state, at: Date.now() });
      queryClient.setQueryData<DeviceDto[]>(deviceKeys.list(), (old) =>
        old?.map((device) =>
          device.nodeId === nodeId && device.power
            ? { ...device, power: { ...device.power, on: state } }
            : device,
        ),
      );
      return { previous };
    },
    // 실패 시 rollback
    onError: (_error, { nodeId }, context) => {
      pendingPower.delete(nodeId);
      if (context?.previous) {
        queryClient.setQueryData(deviceKeys.list(), context.previous);
      }
    },
    // 성공/실패 후 서버 상태로 재동기화 (overlay가 서버 반영 전까지 값을 잡아준다)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}
