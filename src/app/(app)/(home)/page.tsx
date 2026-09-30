import Link from "next/link";
import { connection } from "next/server";

import { DashboardMatterCard } from "@/components/dashboard-matter-card";
import { EnergySummary } from "@/components/energy-summary";
import { SmartThingsDeviceCard } from "@/components/smartthings-device-card";
import { UnavailableDeviceCard } from "@/components/unavailable-device-card";
import { getDashboard } from "@/lib/db/dashboard";
import { withCustomNames } from "@/lib/db/smartthings-device-names";
import {
  getDevice,
  getSwitchState,
  isCamera,
  isControllableSwitch,
  type SmartThingsDevice,
} from "@/lib/smartthings";
import type { DashboardDto, DashboardItemDto } from "@/types/dashboard";

type SmartThingsEntry =
  | { device: SmartThingsDevice; switchOn?: boolean | null }
  | { error: string };

// 기기 정보는 10분 캐시(getDevice), 스위치 상태만 매번 조회한다.
async function loadSmartThings(deviceId: string): Promise<SmartThingsEntry> {
  try {
    const [device] = await withCustomNames([await getDevice(deviceId)]);
    const switchOn = isControllableSwitch(device)
      ? await getSwitchState(deviceId).catch(() => null)
      : undefined;
    return { device, switchOn };
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
      <p className="text-sm text-muted-foreground">
        외부 환경 모드입니다. 기기 목록과 전력 사용량은 표시되지 않습니다.
      </p>
    );
  }

  let dashboard: DashboardDto;
  try {
    dashboard = await getDashboard();
  } catch (e) {
    return (
      <p className="text-sm text-danger">
        {e instanceof Error ? e.message : "메인 구성을 불러오지 못했습니다."}
      </p>
    );
  }

  const stIds = dashboard.items
    .filter((i) => i.source === "smartthings")
    .map((i) => i.deviceId);
  const stEntries = new Map(
    await Promise.all(
      stIds.map(async (id) => [id, await loadSmartThings(id)] as const),
    ),
  );

  const renderItem = (item: DashboardItemDto) => {
    const key = `${item.source}:${item.deviceId}`;
    if (item.source === "matter") {
      return <DashboardMatterCard key={key} nodeId={item.deviceId} />;
    }
    const entry = stEntries.get(item.deviceId);
    if (!entry || "error" in entry) {
      return (
        <UnavailableDeviceCard
          key={key}
          source="smartthings"
          deviceId={item.deviceId}
          message={entry?.error ?? "SmartThings 기기를 불러오지 못했습니다."}
        />
      );
    }
    return (
      <SmartThingsDeviceCard
        key={key}
        device={entry.device}
        switchOn={entry.switchOn}
        camera={isCamera(entry.device)}
      />
    );
  };

  // 그룹 순서대로, 그룹 없는 기기는 맨 뒤. 비어 있는 그룹은 숨긴다.
  const ungrouped = dashboard.items.filter((i) => i.groupId === null);
  const sections = [
    ...dashboard.groups.map((g) => ({
      key: `group-${g.id}`,
      title: g.name as string | null,
      items: dashboard.items.filter((i) => i.groupId === g.id),
    })),
    {
      key: "ungrouped",
      title: dashboard.groups.length > 0 ? "기타" : null,
      items: ungrouped,
    },
  ].filter((s) => s.items.length > 0);

  return (
    <>
      <EnergySummary />
      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          <b className="mb-1 block text-base font-semibold text-foreground">
            메인에 표시할 기기가 없습니다
          </b>
          기기관리에서 ‘메인 표시’를 켜 주세요.{" "}
          <Link
            href="/devices"
            className="font-semibold text-foreground underline underline-offset-3"
          >
            기기관리로 이동
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.key} className="flex flex-col gap-3">
              {section.title && (
                <h2 className="flex items-baseline gap-2 text-xl font-bold tracking-[-.01em]">
                  {section.title}
                  <span className="text-sm font-medium text-muted-foreground">
                    {section.items.length}
                  </span>
                </h2>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {section.items.map(renderItem)}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
