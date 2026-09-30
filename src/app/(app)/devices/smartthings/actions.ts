"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import {
  deleteSmartThingsDeviceName,
  setSmartThingsDeviceName,
} from "@/lib/db/smartthings-device-names";
import { setSwitch, takeSnapshot } from "@/lib/smartthings";
import { smartThingsDeviceIdSchema } from "@/lib/validations/dashboard";

const schema = z.object({ deviceId: smartThingsDeviceIdSchema, on: z.boolean() });

const renameSchema = z.object({
  deviceId: smartThingsDeviceIdSchema,
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(64),
});

// Server Function은 직접 POST로도 호출되므로 여기서 인증을 다시 확인한다.
export async function setSwitchAction(deviceId: string, on: boolean) {
  if (!(await getSession())) throw new Error("인증이 필요합니다.");
  const parsed = schema.parse({ deviceId, on });
  await setSwitch(parsed.deviceId, parsed.on);
}

export async function takeSnapshotAction(deviceId: string) {
  if (!(await getSession())) throw new Error("인증이 필요합니다.");
  const updated = await takeSnapshot(smartThingsDeviceIdSchema.parse(deviceId));
  if (!updated) throw new Error("새 스냅샷이 아직 도착하지 않았습니다. 카메라가 꺼져 있을 수 있습니다.");
}

// 앱 안에서만 쓰는 이름. SmartThings의 label은 바꾸지 않는다.
export async function renameDeviceAction(deviceId: string, name: string) {
  if (!(await getSession())) throw new Error("인증이 필요합니다.");
  const parsed = renameSchema.safeParse({ deviceId, name });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "이름이 올바르지 않습니다.");
  }
  await setSmartThingsDeviceName(parsed.data.deviceId, parsed.data.name);
  refresh();
}

export async function resetDeviceNameAction(deviceId: string) {
  if (!(await getSession())) throw new Error("인증이 필요합니다.");
  await deleteSmartThingsDeviceName(smartThingsDeviceIdSchema.parse(deviceId));
  refresh();
}
