import "server-only";

import { eq } from "drizzle-orm";

import type { SmartThingsDevice } from "@/lib/smartthings";

import { getDb } from "./index";
import { smartthingsDeviceNames } from "./schema";

export async function setSmartThingsDeviceName(
  deviceId: string,
  name: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(smartthingsDeviceNames)
    .values({ deviceId, name })
    .onConflictDoUpdate({
      target: smartthingsDeviceNames.deviceId,
      set: { name, updatedAt: new Date() },
    });
}

export async function deleteSmartThingsDeviceName(
  deviceId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(smartthingsDeviceNames)
    .where(eq(smartthingsDeviceNames.deviceId, deviceId));
}

// 앱에서 붙인 이름을 customName으로 덧붙인다.
// 이름은 부가 정보라 DB 조회가 실패해도 기기는 그대로 반환하고, 외부 환경은 DB에 닿지 않으므로 건너뛴다.
export async function withCustomNames<T extends SmartThingsDevice>(
  devices: T[],
): Promise<T[]> {
  if (devices.length === 0 || process.env.EXTERNAL_MODE === "true") {
    return devices;
  }
  try {
    const rows = await getDb().select().from(smartthingsDeviceNames);
    const names = new Map(rows.map((row) => [row.deviceId, row.name]));
    return devices.map((d) => {
      const customName = names.get(d.deviceId);
      return customName ? { ...d, customName } : d;
    });
  } catch (error) {
    console.error("[db] SmartThings 커스텀 이름 조회 실패:", error);
    return devices;
  }
}
