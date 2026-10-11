import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { saveLayout } from "@/lib/db/dashboard";
import { dashboardLayoutSchema } from "@/lib/validations/dashboard";

export const dynamic = "force-dynamic";

// 메인 화면 타일 전체를 교체한다 (순서·그룹·숨김·묶기/풀기 공통 저장).
export async function PUT(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const parsed = dashboardLayoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    await saveLayout(parsed.data.items);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "메인 구성 저장에 실패했습니다." },
      { status: 502 },
    );
  }
}
