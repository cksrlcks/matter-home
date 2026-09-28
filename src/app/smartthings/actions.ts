"use server";

import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { setSwitch } from "@/lib/smartthings";

const schema = z.object({ deviceId: z.uuid(), on: z.boolean() });

// Server Function은 직접 POST로도 호출되므로 여기서 인증을 다시 확인한다.
export async function setSwitchAction(deviceId: string, on: boolean) {
  if (!(await getSession())) throw new Error("인증이 필요합니다.");
  const parsed = schema.parse({ deviceId, on });
  await setSwitch(parsed.deviceId, parsed.on);
}
