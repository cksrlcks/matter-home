"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { DeviceDto, DeviceSwitchDto } from "@/types/matter";

export const deviceKeys = {
  all: ["devices"] as const,
  list: () => [...deviceKeys.all, "list"] as const,
};

// 기기 상태는 명령 직후 바로 반영되지 않고, attribute_updated 이벤트로 뒤늦게
// 올라온다. 그동안 폴링/refetch가 아직 안 바뀐 서버값을 덮어써서 토글이 깜빡인다.
// 사용자가 누른 값(desired)을 서버값이 따라잡을 때까지(또는 TTL) 유지해 깜빡임을 막는다.
const PENDING_POWER_TTL = 8000;
// key는 "<nodeId>:<endpointId>" — 다구 스위치는 구마다 따로 대기한다.
const pendingPower = new Map<string, { desired: boolean; at: number }>();

function pendingKey(nodeId: string, endpointId: number): string {
  return `${nodeId}:${endpointId}`;
}

function overlayPendingPower(devices: DeviceDto[]): DeviceDto[] {
  if (pendingPower.size === 0) return devices;
  const now = Date.now();
  return devices.map((device) => ({
    ...device,
    switches: device.switches.map((sw) => {
      const key = pendingKey(device.nodeId, sw.endpointId);
      const pending = pendingPower.get(key);
      if (!pending) return sw;
      // 서버가 따라잡았거나 TTL 초과 → 낙관값 폐기하고 서버값을 신뢰
      if (sw.on === pending.desired || now - pending.at > PENDING_POWER_TTL) {
        pendingPower.delete(key);
        return sw;
      }
      return { ...sw, on: pending.desired, pending: true };
    }),
  }));
}

// 캐시된 목록에서 특정 스위치만 바꾼다. (낙관적 업데이트용)
function patchSwitch(
  devices: DeviceDto[] | undefined,
  nodeId: string,
  endpointId: number,
  patch: (sw: DeviceSwitchDto) => DeviceSwitchDto,
): DeviceDto[] | undefined {
  return devices?.map((device) =>
    device.nodeId === nodeId
      ? {
          ...device,
          switches: device.switches.map((sw) =>
            sw.endpointId === endpointId ? patch(sw) : sw,
          ),
        }
      : device,
  );
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

type PowerVariables = { nodeId: string; endpointId: number; state: boolean };

async function updatePower({ nodeId, endpointId, state }: PowerVariables) {
  const res = await fetch(`/api/devices/${nodeId}/power`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, endpointId }),
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

type SwitchVariables = { nodeId: string; endpointId: number };
type RenameSwitchVariables = SwitchVariables & { name: string };

async function renameSwitch({ nodeId, endpointId, name }: RenameSwitchVariables) {
  const res = await fetch(`/api/devices/${nodeId}/endpoints/${endpointId}`, {
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

async function resetSwitchName({ nodeId, endpointId }: SwitchVariables) {
  const res = await fetch(`/api/devices/${nodeId}/endpoints/${endpointId}`, {
    method: "DELETE",
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "초기화에 실패했습니다.");
  }
  return data;
}

export function useRenameSwitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: renameSwitch,
    onMutate: async ({ nodeId, endpointId, name }) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.list() });
      const previous = queryClient.getQueryData<DeviceDto[]>(deviceKeys.list());
      queryClient.setQueryData<DeviceDto[]>(deviceKeys.list(), (old) =>
        patchSwitch(old, nodeId, endpointId, (sw) => ({
          ...sw,
          name,
          customName: name,
        })),
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

export function useResetSwitchName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetSwitchName,
    onMutate: async ({ nodeId, endpointId }) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.list() });
      const previous = queryClient.getQueryData<DeviceDto[]>(deviceKeys.list());
      queryClient.setQueryData<DeviceDto[]>(deviceKeys.list(), (old) =>
        patchSwitch(old, nodeId, endpointId, (sw) => ({
          ...sw,
          name: sw.defaultName,
          customName: null,
        })),
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
    onMutate: async ({ nodeId, endpointId, state }) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.list() });
      const previous = queryClient.getQueryData<DeviceDto[]>(deviceKeys.list());
      // 누른 값을 서버가 따라잡을 때까지 유지 → 늦게 오는 stale 폴링에도 안 밀림
      pendingPower.set(pendingKey(nodeId, endpointId), {
        desired: state,
        at: Date.now(),
      });
      queryClient.setQueryData<DeviceDto[]>(deviceKeys.list(), (old) =>
        patchSwitch(old, nodeId, endpointId, (sw) => ({ ...sw, on: state })),
      );
      return { previous };
    },
    // 실패 시 rollback
    onError: (_error, { nodeId, endpointId }, context) => {
      pendingPower.delete(pendingKey(nodeId, endpointId));
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
