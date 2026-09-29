import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type {
  DashboardDto,
  DashboardGroupDto,
  DeviceSource,
} from "@/types/dashboard";

import { getDb } from "./index";
import { dashboardGroups, dashboardItems } from "./schema";

export async function getDashboard(): Promise<DashboardDto> {
  const db = getDb();
  const [groups, items] = await Promise.all([
    db
      .select({ id: dashboardGroups.id, name: dashboardGroups.name })
      .from(dashboardGroups)
      .orderBy(asc(dashboardGroups.createdAt), asc(dashboardGroups.id)),
    db
      .select({
        source: dashboardItems.source,
        deviceId: dashboardItems.deviceId,
        groupId: dashboardItems.groupId,
      })
      .from(dashboardItems)
      .orderBy(asc(dashboardItems.createdAt)),
  ]);
  return { groups, items };
}

export async function createGroup(name: string): Promise<DashboardGroupDto> {
  const db = getDb();
  const [group] = await db
    .insert(dashboardGroups)
    .values({ name })
    .returning({ id: dashboardGroups.id, name: dashboardGroups.name });
  return group;
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

async function groupExists(id: number): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: dashboardGroups.id })
    .from(dashboardGroups)
    .where(eq(dashboardGroups.id, id));
  return rows.length > 0;
}

// 메인에 추가하거나, 이미 있으면 그룹만 바꾼다.
export async function upsertDashboardItem(
  source: DeviceSource,
  deviceId: string,
  groupId: number | null,
): Promise<void> {
  if (groupId !== null && !(await groupExists(groupId))) {
    throw new Error("존재하지 않는 그룹입니다.");
  }
  const db = getDb();
  await db
    .insert(dashboardItems)
    .values({ source, deviceId, groupId })
    .onConflictDoUpdate({
      target: [dashboardItems.source, dashboardItems.deviceId],
      set: { groupId },
    });
}

export async function deleteDashboardItem(
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
