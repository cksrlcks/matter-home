import { AddDeviceButton } from "@/components/add-device-button";
import { DeviceList } from "@/components/device-list";
import { EnergySummary } from "@/components/energy-summary";
import { LogoutButton } from "@/components/logout-button";
import { NavTabs } from "@/components/nav-tabs";
import { connection } from "next/server";

export default async function HomePage() {
  // 빌드 시점이 아니라 요청 시점의 env를 읽도록 동적 렌더링
  await connection();
  const external = process.env.EXTERNAL_MODE === "true";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matter Home</h1>
          <p className="text-sm text-muted-foreground">스마트홈 기기 관리</p>
        </div>
        <div className="flex items-center gap-2">
          {!external && <AddDeviceButton />}
          <LogoutButton />
        </div>
      </header>
      <NavTabs active="/" />
      {external ? (
        <p className="text-sm text-muted-foreground">
          외부 환경 모드입니다. 기기 목록과 전력 사용량은 표시되지 않습니다.
        </p>
      ) : (
        <>
          <EnergySummary />
          <DeviceList />
        </>
      )}
    </main>
  );
}
