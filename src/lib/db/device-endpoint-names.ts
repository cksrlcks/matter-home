import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "./index";
import { deviceEndpointNames } from "./schema";

export function endpointNameKey(nodeId: string, endpointId: number): string {
  return `${nodeId}:${endpointId}`;
}

// "<nodeId>:<endpointId>" → 사용자 지정 이름 맵
export async function getEndpointNameMap(): Promise<Map<string, string>> {
  const db = getDb();
  const rows = await db.select().from(deviceEndpointNames);
  return new Map(
    rows.map((row) => [endpointNameKey(row.nodeId, row.endpointId), row.name]),
  );
}

export async function setEndpointName(
  nodeId: string,
  endpointId: number,
  name: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(deviceEndpointNames)
    .values({ nodeId, endpointId, name })
    .onConflictDoUpdate({
      target: [deviceEndpointNames.nodeId, deviceEndpointNames.endpointId],
      set: { name, updatedAt: new Date() },
    });
}

export async function deleteEndpointName(
  nodeId: string,
  endpointId: number,
): Promise<void> {
  const db = getDb();
  await db
    .delete(deviceEndpointNames)
    .where(
      and(
        eq(deviceEndpointNames.nodeId, nodeId),
        eq(deviceEndpointNames.endpointId, endpointId),
      ),
    );
}

// 기기 제거 시 해당 node의 endpoint 이름을 모두 정리한다.
export async function deleteEndpointNames(nodeId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(deviceEndpointNames)
    .where(eq(deviceEndpointNames.nodeId, nodeId));
}
