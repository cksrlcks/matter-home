import "server-only";

import { and, asc, eq, max } from "drizzle-orm";

import type {
  DashboardDto,
  DashboardGroupDto,
  DashboardItemDto,
  DeviceSource,
} from "@/types/dashboard";

import { getDb } from "./index";
import {
  dashboardGroups,
  dashboardItems,
  WHOLE_DEVICE_ENDPOINT,
} from "./schema";

export async function getDashboard(): Promise<DashboardDto> {
  const db = getDb();
  const [groups, rows] = await Promise.all([
    db
      .select({ id: dashboardGroups.id, name: dashboardGroups.name })
      .from(dashboardGroups)
      .orderBy(asc(dashboardGroups.position), asc(dashboardGroups.id)),
    db
      .select({
        source: dashboardItems.source,
        deviceId: dashboardItems.deviceId,
        endpointId: dashboardItems.endpointId,
        groupId: dashboardItems.groupId,
      })
      .from(dashboardItems)
      .orderBy(asc(dashboardItems.position), asc(dashboardItems.createdAt)),
  ]);
  const items = rows.map((row) => ({
    ...row,
    endpointId: row.endpointId === WHOLE_DEVICE_ENDPOINT ? null : row.endpointId,
  }));
  return { groups, items };
}

// 새 그룹은 맨 뒤에 붙인다.
export async function createGroup(name: string): Promise<DashboardGroupDto> {
  const db = getDb();
  const [last] = await db
    .select({ position: max(dashboardGroups.position) })
    .from(dashboardGroups);
  const [group] = await db
    .insert(dashboardGroups)
    .values({ name, position: (last?.position ?? 0) + 1 })
    .returning({ id: dashboardGroups.id, name: dashboardGroups.name });
  return group;
}

// 그룹 순서를 ids 순서대로 다시 매긴다. (목록에 없는 그룹은 그대로 둔다)
export async function reorderGroups(ids: number[]): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(dashboardGroups)
        .set({ position: index + 1 })
        .where(eq(dashboardGroups.id, id));
    }
  });
}

// 메인 화면 타일 전체를 주어진 배열(화면 순서)로 교체한다.
// 순서 변경·그룹 이동·숨기기·묶기/풀기를 모두 이 한 번의 저장으로 처리한다.
// 없는 그룹을 가리키는 타일은 그룹 미지정으로 둔다.
export async function saveLayout(items: DashboardItemDto[]): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const groups = await tx.select({ id: dashboardGroups.id }).from(dashboardGroups);
    const groupIds = new Set(groups.map((g) => g.id));
    await tx.delete(dashboardItems);
    if (items.length === 0) return;
    await tx.insert(dashboardItems).values(
      items.map((item, index) => ({
        source: item.source,
        deviceId: item.deviceId,
        endpointId: item.endpointId ?? WHOLE_DEVICE_ENDPOINT,
        groupId:
          item.groupId !== null && groupIds.has(item.groupId) ? item.groupId : null,
        position: index + 1,
      })),
    );
  });
}

// 없는 그룹이면 false
export async function renameGroup(id: number, name: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .update(dashboardGroups)
    .set({ name })
    .where(eq(dashboardGroups.id, id))
    .returning({ id: dashboardGroups.id });
  return rows.length > 0;
}

// 그룹에 속한 기기는 FK(on delete set null)로 그룹 미지정이 된다.
export async function deleteGroup(id: number): Promise<void> {
  const db = getDb();
  await db.delete(dashboardGroups).where(eq(dashboardGroups.id, id));
}

// 기기 제거 시: 그 기기의 타일(전체/구별)을 모두 메인에서 뺀다.
export async function deleteDashboardDevice(
  source: DeviceSource,
  deviceId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(dashboardItems)
    .where(
      and(
        eq(dashboardItems.source, source),
        eq(dashboardItems.deviceId, deviceId),
      ),
    );
}
