"use server";

import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { setSwitch, takeSnapshot } from "@/lib/smartthings";

const schema = z.object({ deviceId: z.uuid(), on: z.boolean() });

// Server Function은 직접 POST로도 호출되므로 여기서 인증을 다시 확인한다.
export async function setSwitchAction(deviceId: string, on: boolean) {
  if (!(await getSession())) throw new Error("인증이 필요합니다.");
  const parsed = schema.parse({ deviceId, on });
  await setSwitch(parsed.deviceId, parsed.on);
}

export async function takeSnapshotAction(deviceId: string) {
  if (!(await getSession())) throw new Error("인증이 필요합니다.");
  const updated = await takeSnapshot(z.uuid().parse(deviceId));
  if (!updated) throw new Error("새 스냅샷이 아직 도착하지 않았습니다. 카메라가 꺼져 있을 수 있습니다.");
}
