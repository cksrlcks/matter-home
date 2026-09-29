import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getDashboard } from "@/lib/db/dashboard";

export const dynamic = "force-dynamic";

// 메인 화면 구성 (그룹 + 표시할 기기)
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getDashboard());
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "메인 구성을 불러오지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
