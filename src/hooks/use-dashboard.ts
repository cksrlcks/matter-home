"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  DashboardDto,
  DashboardGroupDto,
  DeviceSource,
} from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  detail: () => [...dashboardKeys.all, "detail"] as const,
};

async function request<T>(url: string, init: RequestInit, fallback: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? fallback);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.detail(),
    queryFn: () =>
      request<DashboardDto>("/api/dashboard", {}, "메인 구성을 불러오지 못했습니다."),
  });
}

// 모든 변경은 낙관적으로 캐시에 반영하고, 실패 시 되돌린 뒤 서버값으로 재동기화한다.
function useDashboardMutation<V>(
  mutationFn: (variables: V) => Promise<unknown>,
  optimistic: (old: DashboardDto, variables: V) => DashboardDto,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.detail() });
      const previous = queryClient.getQueryData<DashboardDto>(dashboardKeys.detail());
      if (previous) {
        queryClient.setQueryData(dashboardKeys.detail(), optimistic(previous, variables));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dashboardKeys.detail(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail() });
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      request<DashboardGroupDto>(
        "/api/dashboard/groups",
        { method: "POST", body: JSON.stringify({ name }) },
        "그룹 생성에 실패했습니다.",
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail() });
    },
  });
}

export function useRenameGroup() {
  return useDashboardMutation(
    ({ id, name }: DashboardGroupDto) =>
      request(
        `/api/dashboard/groups/${id}`,
        { method: "PATCH", body: JSON.stringify({ name }) },
        "그룹 이름 변경에 실패했습니다.",
      ),
    (old, { id, name }) => ({
      ...old,
      groups: old.groups.map((g) => (g.id === id ? { ...g, name } : g)),
    }),
  );
}

export function useDeleteGroup() {
  return useDashboardMutation(
    (id: number) =>
      request(`/api/dashboard/groups/${id}`, { method: "DELETE" }, "그룹 삭제에 실패했습니다."),
    (old, id) => ({
      groups: old.groups.filter((g) => g.id !== id),
      items: old.items.map((i) => (i.groupId === id ? { ...i, groupId: null } : i)),
    }),
  );
}

type ItemKey = { source: DeviceSource; deviceId: string };
const itemUrl = ({ source, deviceId }: ItemKey) =>
  `/api/dashboard/items/${source}/${encodeURIComponent(deviceId)}`;
const sameItem = (a: ItemKey, b: ItemKey) =>
  a.source === b.source && a.deviceId === b.deviceId;

// 메인에 추가 또는 그룹 변경
export function useSetDashboardItem() {
  return useDashboardMutation(
    ({ groupId, ...key }: ItemKey & { groupId: number | null }) =>
      request(
        itemUrl(key),
        { method: "PUT", body: JSON.stringify({ groupId }) },
        "메인 표시 설정에 실패했습니다.",
      ),
    (old, item) => ({
      ...old,
      items: old.items.some((i) => sameItem(i, item))
        ? old.items.map((i) => (sameItem(i, item) ? item : i))
        : [...old.items, item],
    }),
  );
}

export function useRemoveDashboardItem() {
  return useDashboardMutation(
    (key: ItemKey) =>
      request(itemUrl(key), { method: "DELETE" }, "메인 표시 해제에 실패했습니다."),
    (old, key) => ({ ...old, items: old.items.filter((i) => !sameItem(i, key)) }),
  );
}
