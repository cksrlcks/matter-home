import "server-only";

// SmartThings 클라우드 API 호출. 토큰은 server-only env.
export type SmartThingsDevice = {
  deviceId: string;
  label?: string;
  name: string;
  manufacturerName?: string;
  deviceTypeName?: string;
};

// 켜짐/꺼짐 제어를 허용하는 기기 종류
const SWITCH_DEVICE_NAME = "c2c-switch";

export const isControllableSwitch = (d: SmartThingsDevice) =>
  d.name === SWITCH_DEVICE_NAME;

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

export async function setSwitch(deviceId: string, on: boolean): Promise<void> {
  const id = encodeURIComponent(deviceId);
  // 클라이언트가 보낸 id를 믿지 않고, 실제로 c2c-switch인지 확인한다.
  const device = await stFetch<SmartThingsDevice>(`/devices/${id}`);
  if (!isControllableSwitch(device)) {
    throw new Error("제어할 수 없는 기기입니다.");
  }
  await stFetch(`/devices/${id}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { component: "main", capability: "switch", command: on ? "on" : "off" },
      ],
    }),
  });
}
