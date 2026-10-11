"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  DashboardDto,
  DashboardGroupDto,
  DashboardItemDto,
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

export function useDashboard(initialData?: DashboardDto) {
  return useQuery({
    queryKey: dashboardKeys.detail(),
    initialData,
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
      ...old,
      groups: old.groups.filter((g) => g.id !== id),
      items: old.items.map((i) => (i.groupId === id ? { ...i, groupId: null } : i)),
    }),
  );
}

// 메인 화면 타일 전체(화면 순서)를 저장한다. 순서 변경·그룹 이동·숨기기·묶기/풀기 공통.
// 새 배열은 lib/dashboard-layout.ts의 함수로 만든다.
export function useSaveLayout() {
  return useDashboardMutation(
    (items: DashboardItemDto[]) =>
      request(
        "/api/dashboard/layout",
        { method: "PUT", body: JSON.stringify({ items }) },
        "메인 구성 저장에 실패했습니다.",
      ),
    (old, items) => ({ ...old, items }),
  );
}

export function useReorderGroups() {
  return useDashboardMutation(
    (ids: number[]) =>
      request(
        "/api/dashboard/groups/order",
        { method: "PUT", body: JSON.stringify({ ids }) },
        "그룹 순서 변경에 실패했습니다.",
      ),
    (old, ids) => ({
      ...old,
      groups: ids.flatMap((id) => old.groups.find((g) => g.id === id) ?? []),
    }),
  );
}
