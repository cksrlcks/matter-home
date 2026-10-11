import type { ReactNode } from "react";
import { connection } from "next/server";

import { GroupManager } from "@/components/group-manager";
import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WifiSettingsButton } from "@/components/wifi-settings-button";

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </li>
  );
}

export default async function SettingsPage() {
  // 빌드 시점이 아니라 요청 시점의 env를 읽도록 동적 렌더링
  await connection();
  // 외부 환경에서는 DB·Matter 서버에 닿지 않으므로 관련 설정을 숨긴다.
  const external = process.env.EXTERNAL_MODE === "true";

  return (
    <>
      <PageHeader title="설정" />
      <div className="flex flex-col gap-8">
        {!external && <GroupManager />}

        <section className="flex flex-col gap-4">
          <h2 className="text-xl">연결</h2>
          <Card>
            <ul className="divide-y divide-border">
              {!external && (
                <Row
                  title="Wi-Fi"
                  description="Wi-Fi 방식 Matter 기기를 추가할 때 기기에 전달할 집 Wi-Fi"
                >
                  <WifiSettingsButton />
                </Row>
              )}
              <Row
                title="SmartThings"
                description="계정 연결이 끊겼을 때 다시 연결"
              >
                {/* API 라우트로 이동해 외부로 리다이렉트되므로 <Link>가 아닌 <a>를 쓴다. */}
                <a
                  href="/api/smartthings/oauth/start"
                  className={buttonClassName({ variant: "outline" })}
                >
                  연결
                </a>
              </Row>
              <Row title="계정" description="이 기기에서 로그아웃">
                <LogoutButton />
              </Row>
            </ul>
          </Card>
        </section>
      </div>
    </>
  );
}
