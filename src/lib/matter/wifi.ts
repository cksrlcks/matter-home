import "server-only";

import type { WifiCredentialsDto } from "@/types/matter";

import { getMatterClient } from "./client";

// Wi-Fi Matter 기기 commissioning에 쓰는 Wi-Fi 자격 정보.
// matter-server의 reserved `default` 항목 하나만 다룬다. 비밀번호는 서버로 전달만 하고
// 앱(DB/로그)에는 남기지 않으며, 서버도 SSID만 돌려준다.
const DEFAULT_CREDENTIALS_ID = "default";

export async function getWifiCredentials(): Promise<WifiCredentialsDto> {
  const client = await getMatterClient();
  const { wifi } = await client.getAllCredentials();
  const entry = wifi.find((w) => w.id === DEFAULT_CREDENTIALS_ID);
  return { ssid: entry?.ssid ?? null };
}

export async function setWifiCredentials(
  ssid: string,
  password: string,
): Promise<void> {
  const client = await getMatterClient();
  await client.setWifiCredentials(ssid, password);
}

export async function removeWifiCredentials(): Promise<void> {
  const client = await getMatterClient();
  await client.removeWifiCredentials();
}
