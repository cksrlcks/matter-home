// 기기 종류. 타일 색과 그림을 고르는 기준. (server-only import 금지)

export const DEVICE_KINDS = [
  "light",
  "plug",
  "switch",
  "camera",
  "tv",
  "other",
] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

// 켜진 타일의 배경색. (Tailwind가 클래스를 찾을 수 있게 전체 이름을 그대로 적는다)
export const KIND_TILE_CLASS: Record<DeviceKind, string> = {
  light: "bg-tile-light",
  plug: "bg-tile-plug",
  switch: "bg-tile-switch",
  camera: "bg-tile-camera",
  tv: "bg-tile-tv",
  other: "bg-tile-other",
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
