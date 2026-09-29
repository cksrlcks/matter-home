import Link from "next/link";
import { connection } from "next/server";

import { LogoutButton } from "@/components/logout-button";
import { NavTabs } from "@/components/nav-tabs";
import { SmartThingsSwitch } from "@/components/smartthings-switch";
import { Card } from "@/components/ui/card";
import {
  getDevices,
  getSwitchState,
  isCamera,
  isControllableSwitch,
  type SmartThingsDevice,
} from "@/lib/smartthings";

export default async function SmartThingsPage() {
  await connection();

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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matter Home</h1>
          <p className="text-sm text-muted-foreground">스마트홈 기기 관리</p>
        </div>
        <LogoutButton />
      </header>
      <NavTabs active="/smartthings" />

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 기기가 없습니다.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <Card key={d.deviceId} className="flex flex-col gap-1 p-5">
              {isCamera(d) ? (
                <Link
                  href={`/smartthings/${d.deviceId}`}
                  className="truncate font-semibold hover:underline"
                >
                  {d.label || d.name} →
                </Link>
              ) : (
                <p className="truncate font-semibold">{d.label || d.name}</p>
              )}
              <p className="truncate text-sm text-muted-foreground">
                {[d.manufacturerName, d.deviceTypeName ?? d.name]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {switchStates.has(d.deviceId) && (
                <SmartThingsSwitch
                  deviceId={d.deviceId}
                  initialOn={switchStates.get(d.deviceId) ?? null}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
