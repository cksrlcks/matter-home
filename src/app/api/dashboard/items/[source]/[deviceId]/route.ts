import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { deleteDashboardItem, upsertDashboardItem } from "@/lib/db/dashboard";
import {
  dashboardItemBodySchema,
  dashboardItemKeySchema,
} from "@/lib/validations/dashboard";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ source: string; deviceId: string }> };

// 메인에 기기 추가 또는 그룹 변경
export async function PUT(request: NextRequest, { params }: Context) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const key = dashboardItemKeySchema.safeParse(await params);
  const body = dashboardItemBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!key.success || !body.success) {
    return NextResponse.json({ message: "요청이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    await upsertDashboardItem(key.data.source, key.data.deviceId, body.data.groupId);
    return NextResponse.json({ ...key.data, groupId: body.data.groupId });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "메인 표시 설정에 실패했습니다." },
      { status: 502 },
    );
  }
}

// 메인에서 기기 제외
export async function DELETE(_request: NextRequest, { params }: Context) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const key = dashboardItemKeySchema.safeParse(await params);
  if (!key.success) {
    return NextResponse.json({ message: "요청이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    await deleteDashboardItem(key.data.source, key.data.deviceId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "메인 표시 해제에 실패했습니다." },
      { status: 502 },
    );
  }
}
