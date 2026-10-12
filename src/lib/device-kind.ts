// 기기 종류. 타일 색과 그림을 고르는 기준. (server-only import 금지)

import type { DeviceDto, DeviceSwitchDto } from "@/types/matter";

export const DEVICE_KINDS = [
  "light",
  "plug",
  "switch",
  "camera",
  "tv",
  "other",
] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

// 켜진 타일의 틴트 바탕과 포인트 글자색.
// (Tailwind가 클래스를 찾을 수 있게 전체 이름을 그대로 적는다)
export const KIND_STYLE: Record<DeviceKind, { tint: string; text: string }> = {
  light: { tint: "bg-tile-light/20", text: "text-tile-light" },
  plug: { tint: "bg-tile-plug/20", text: "text-tile-plug" },
  switch: { tint: "bg-tile-switch/20", text: "text-tile-switch" },
  camera: { tint: "bg-tile-camera/20", text: "text-tile-camera" },
  tv: { tint: "bg-tile-tv/20", text: "text-tile-tv" },
  other: { tint: "bg-tile-other/20", text: "text-tile-other" },
};

// 이름·종류 문자열에서 기기 종류를 짐작한다. 못 맞추면 fallback.
export function kindFromHint(hint: string, fallback: DeviceKind = "other"): DeviceKind {
  const text = hint.toLowerCase();
  if (/camera|카메라|cam\b/.test(text)) return "camera";
  if (/\btv\b|television|티비|텔레비전|frame/.test(text)) return "tv";
  if (/plug|outlet|콘센트|플러그|멀티탭/.test(text)) return "plug";
  if (/light|bulb|lamp|조명|전구|등$|등\s/.test(text)) return "light";
  if (/switch|스위치/.test(text)) return "switch";
  return fallback;
}

// Matter 기기(또는 그 안의 구 하나)의 종류.
export function matterKind(device: DeviceDto, sw?: DeviceSwitchDto): DeviceKind {
  if (!sw) {
    if (device.energy) return "plug";
    const types = device.endpoints.map((e) => e.deviceType ?? "").join(" ");
    return kindFromHint(`${device.name} ${types}`);
  }
  const type = device.endpoints.find((e) => e.id === sw.endpointId)?.deviceType ?? "";
  return kindFromHint(`${sw.name} ${type}`, "switch");
}

// SmartThings 기기의 종류. c2c-switch는 대부분 조명이라 못 맞추면 전구로 둔다.
export function smartThingsKind(
  device: { deviceTypeName?: string; label?: string; name: string },
  camera: boolean,
): DeviceKind {
  if (camera) return "camera";
  return kindFromHint(
    `${device.deviceTypeName ?? ""} ${device.label ?? ""} ${device.name}`,
    "light",
  );
}
