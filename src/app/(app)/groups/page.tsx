import { connection } from "next/server";

import { GroupManager } from "@/components/group-manager";

export default async function GroupsPage() {
  // 빌드 시점이 아니라 요청 시점의 env를 읽도록 동적 렌더링
  await connection();
  if (process.env.EXTERNAL_MODE === "true") {
    return (
      <p className="text-sm text-muted-foreground">
        외부 환경 모드입니다. 그룹 설정은 표시되지 않습니다.
      </p>
    );
  }

  return <GroupManager />;
}
