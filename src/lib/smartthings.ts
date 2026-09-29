import "server-only";

// SmartThings 클라우드 API 호출. 토큰은 server-only env.
export type SmartThingsDevice = {
  deviceId: string;
  label?: string;
  name: string;
  manufacturerName?: string;
  deviceTypeName?: string;
};

const CAMERA_DEVICE_NAME = "imi.camera.default";

export const isCamera = (d: SmartThingsDevice) => d.name === CAMERA_DEVICE_NAME;

// 켜짐/꺼짐 제어를 허용하는 기기 종류
export const isControllableSwitch = (d: SmartThingsDevice) =>
  d.name === "c2c-switch" || isCamera(d);

async function stFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.SMARTTHINGS_TOKEN;
  if (!token) throw new Error("SMARTTHINGS_TOKEN 환경변수가 설정되지 않았습니다.");

  const res = await fetch(`https://api.smartthings.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SmartThings API 오류 (${res.status})`);
  return res.json();
}

// ponytail: 첫 페이지(최대 200개)만 가져옴, 넘으면 _links.next 따라가기
export async function getDevices(): Promise<SmartThingsDevice[]> {
  const data = await stFetch<{ items: SmartThingsDevice[] }>("/devices");
  return data.items;
}

// on/off, 오프라인 등으로 값이 없으면 null
export async function getSwitchState(deviceId: string): Promise<boolean | null> {
  const data = await stFetch<{ switch: { value: "on" | "off" | null } }>(
    `/devices/${encodeURIComponent(deviceId)}/components/main/capabilities/switch/status`,
  );
  return data.switch.value === null ? null : data.switch.value === "on";
}

export function getDevice(deviceId: string): Promise<SmartThingsDevice> {
  return stFetch(`/devices/${encodeURIComponent(deviceId)}`);
}

async function sendCommand(deviceId: string, capability: string, command: string) {
  await stFetch(`/devices/${encodeURIComponent(deviceId)}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands: [{ component: "main", capability, command }] }),
  });
}

export async function setSwitch(deviceId: string, on: boolean): Promise<void> {
  // 클라이언트가 보낸 id를 믿지 않고, 실제로 제어 가능한 기기인지 확인한다.
  if (!isControllableSwitch(await getDevice(deviceId))) {
    throw new Error("제어할 수 없는 기기입니다.");
  }
  await sendCommand(deviceId, "switch", on ? "on" : "off");
}

// ── 카메라 ──
// 실시간 영상(videoStream)은 인증된 rtsps 주소라 개인 토큰으로는 재생할 수 없어서,
// 스냅샷(imageCapture)과 최근 녹화 클립(videoCapture)만 다룬다.

type Attr<T> = { value: T | null; timestamp?: string };

export type CameraStatus = {
  on: boolean | null;
  imageUrl: string | null;
  captureTime: string | null;
  clipUrl: string | null;
  clipTime: string | null;
  motion: Attr<string>;
  sound: Attr<string>;
};

async function fetchCameraStatus(deviceId: string): Promise<CameraStatus> {
  const { components } = await stFetch<{
    components: { main: Record<string, Record<string, Attr<unknown>>> };
  }>(`/devices/${encodeURIComponent(deviceId)}/status`);
  const m = components.main;
  const clip = m.videoCapture?.clip as Attr<{ clipPath?: string }> | undefined;
  const sw = m.switch?.switch.value;
  return {
    on: sw == null ? null : sw === "on",
    imageUrl: (m.imageCapture?.image.value as string | null) ?? null,
    captureTime: (m.imageCapture?.captureTime.value as string | null) ?? null,
    clipUrl: clip?.value?.clipPath ?? null,
    clipTime: clip?.timestamp ?? null,
    motion: (m.motionSensor?.motion ?? { value: null }) as Attr<string>,
    sound: (m.soundSensor?.sound ?? { value: null }) as Attr<string>,
  };
}

// 기기 상태 조회는 기기당 1분 10회로 제한된다(초과 시 429).
// 상세 화면 한 번에 화면/스냅샷/클립이 각각 조회하므로 10초간 결과를 재사용한다.
// ponytail: 프로세스 메모리 캐시, 인스턴스가 여러 개면 공유되지 않음
const STATUS_TTL_MS = 10_000;
const statusCache = new Map<string, { at: number; value: Promise<CameraStatus> }>();

export function getCameraStatus(deviceId: string): Promise<CameraStatus> {
  const hit = statusCache.get(deviceId);
  if (hit && Date.now() - hit.at < STATUS_TTL_MS) return hit.value;

  const value = fetchCameraStatus(deviceId);
  statusCache.set(deviceId, { at: Date.now(), value });
  // 실패(429 등)는 캐시하지 않는다.
  value.catch(() => statusCache.delete(deviceId));
  return value;
}

async function assertCamera(deviceId: string) {
  if (!isCamera(await getDevice(deviceId))) {
    throw new Error("카메라가 아닙니다.");
  }
}

// 새 스냅샷을 찍고, 이미지가 바뀔 때까지 기다린다. (실측 약 4초)
// 조회 한도 때문에 3초 간격으로 최대 5번만 확인한다.
export async function takeSnapshot(deviceId: string): Promise<boolean> {
  await assertCamera(deviceId);
  const before = (await getCameraStatus(deviceId)).captureTime;
  await sendCommand(deviceId, "imageCapture", "take");
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await fetchCameraStatus(deviceId);
    if (status.captureTime !== before) {
      // 새로고침된 화면이 새 이미지를 보도록 캐시를 갱신한다.
      statusCache.set(deviceId, { at: Date.now(), value: Promise.resolve(status) });
      return true;
    }
  }
  return false;
}

// 스냅샷/클립 파일을 토큰을 붙여 가져온다. URL은 기기 상태에서 읽은 값만 사용한다(SSRF 방지).
export async function fetchCameraMedia(
  deviceId: string,
  type: "image" | "clip",
  range: string | null,
): Promise<Response | null> {
  await assertCamera(deviceId);
  const status = await getCameraStatus(deviceId);
  const raw = type === "image" ? status.imageUrl : status.clipUrl;
  if (!raw) return null;

  const url = new URL(raw);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".st-av.net")) {
    throw new Error("허용되지 않은 미디어 주소입니다.");
  }
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.SMARTTHINGS_TOKEN}`,
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
  });
}
