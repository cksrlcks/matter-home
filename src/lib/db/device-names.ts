import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./index";
import { deviceNames } from "./schema";

// nodeId → 사용자 지정 이름 맵
export async function getDeviceNameMap(): Promise<Map<string, string>> {
  const db = getDb();
  const rows = await db.select().from(deviceNames);
  return new Map(rows.map((row) => [row.nodeId, row.name]));
}

export async function setDeviceName(
  nodeId: string,
  name: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(deviceNames)
    .values({ nodeId, name })
    .onConflictDoUpdate({
      target: deviceNames.nodeId,
      set: { name, updatedAt: new Date() },
    });
}

export async function deleteDeviceName(nodeId: string): Promise<void> {
  const db = getDb();
  await db.delete(deviceNames).where(eq(deviceNames.nodeId, nodeId));
}
