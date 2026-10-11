import { connection } from "next/server";

import { HomeBoard } from "@/components/home-board";
import { PageHeader } from "@/components/page-header";
import { getDashboard } from "@/lib/db/dashboard";
import { withCustomNames } from "@/lib/db/smartthings-device-names";
import { kindFromHint } from "@/lib/device-kind";
import {
  displayName,
  getDevice,
  getSwitchState,
  isCamera,
  isControllableSwitch,
} from "@/lib/smartthings";
import type { DashboardDto } from "@/types/dashboard";
import type { SmartThingsTileDto } from "@/types/home";

// 기기 정보는 10분 캐시(getDevice), 스위치 상태만 매번 조회한다.
async function loadSmartThings(deviceId: string): Promise<SmartThingsTileDto> {
  try {
    const [device] = await withCustomNames([await getDevice(deviceId)]);
    const camera = isCamera(device);
    const switchOn = isControllableSwitch(device)
      ? await getSwitchState(deviceId).catch(() => null)
      : undefined;
    const defaultName = device.label || device.name;
    return {
      name: displayName(device),
      defaultName,
      customName: device.customName ?? null,
      // c2c-switch는 대부분 조명이라 못 맞추면 전구로 둔다.
      kind: camera
        ? "camera"
        : kindFromHint(
            `${device.deviceTypeName ?? ""} ${defaultName} ${device.name}`,
            "light",
          ),
      camera,
      switchOn,
    };
  } catch (e) {
    const status = (e as { status?: number }).status;
    return {
      error:
        status === 401
          ? "SmartThings 연결이 필요합니다."
          : status === 404 || status === 403
            ? "SmartThings에서 찾을 수 없는 기기입니다."
            : "SmartThings 기기를 불러오지 못했습니다.",
    };
  }
}

export default async function HomePage() {
  // 빌드 시점이 아니라 요청 시점의 env를 읽도록 동적 렌더링
  await connection();
  if (process.env.EXTERNAL_MODE === "true") {
    return (
      <>
        <PageHeader title="우리집" />
        <p className="text-sm text-muted-foreground">
          외부 환경 모드입니다. 기기 목록과 전력 사용량은 표시되지 않습니다.
        </p>
      </>
    );
  }

  let dashboard: DashboardDto;
  try {
    dashboard = await getDashboard();
  } catch (e) {
    return (
      <>
        <PageHeader title="우리집" />
        <p className="text-sm text-danger">
          {e instanceof Error ? e.message : "메인 구성을 불러오지 못했습니다."}
        </p>
      </>
    );
  }

  const stIds = dashboard.items
    .filter((i) => i.source === "smartthings")
    .map((i) => i.deviceId);
  const smartThings = Object.fromEntries(
    await Promise.all(
      stIds.map(async (id) => [id, await loadSmartThings(id)] as const),
    ),
  );

  return <HomeBoard initialDashboard={dashboard} smartThings={smartThings} />;
}
