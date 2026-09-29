import { connection } from "next/server";

import { DashboardControl } from "@/components/dashboard-control";
import { SmartThingsDeviceCard } from "@/components/smartthings-device-card";
import {
  getDevices,
  getSwitchState,
  isCamera,
  isControllableSwitch,
  type SmartThingsDevice,
} from "@/lib/smartthings";

export default async function SmartThingsDevicesPage() {
  await connection();
  // 외부 환경에서는 DB에 닿지 않으므로 메인 구성 편집을 숨긴다.
  const external = process.env.EXTERNAL_MODE === "true";

  let devices: SmartThingsDevice[] = [];
  // c2c-switch 기기만 켜짐/꺼짐 상태를 조회한다. (조회 실패 시 null)
  const switchStates = new Map<string, boolean | null>();
  let error: string | null = null;
  try {
    devices = await getDevices();
    const switches = devices.filter(isControllableSwitch);
    const states = await Promise.all(
      switches.map((d) => getSwitchState(d.deviceId).catch(() => null)),
    );
    switches.forEach((d, i) => switchStates.set(d.deviceId, states[i]));
  } catch (e) {
    error = e instanceof Error ? e.message : "알 수 없는 오류";
  }

  return (
    <>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 기기가 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {devices.map((d) => (
            <SmartThingsDeviceCard
              key={d.deviceId}
              device={d}
              camera={isCamera(d)}
              switchOn={
                switchStates.has(d.deviceId)
                  ? (switchStates.get(d.deviceId) ?? null)
                  : undefined
              }
              footer={
                !external && (
                  <DashboardControl source="smartthings" deviceId={d.deviceId} />
                )
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
