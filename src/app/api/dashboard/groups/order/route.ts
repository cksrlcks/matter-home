import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { reorderGroups } from "@/lib/db/dashboard";
import { groupOrderSchema } from "@/lib/validations/dashboard";

export const dynamic = "force-dynamic";

// 그룹 순서 변경
export async function PUT(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const parsed = groupOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "요청이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    await reorderGroups(parsed.data.ids);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "그룹 순서 변경에 실패했습니다." },
      { status: 502 },
    );
  }
}
