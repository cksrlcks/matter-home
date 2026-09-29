import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createGroup } from "@/lib/db/dashboard";
import { groupNameSchema } from "@/lib/validations/dashboard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const parsed = groupNameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "그룹 이름이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    const group = await createGroup(parsed.data.name);
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "그룹 생성에 실패했습니다." },
      { status: 502 },
    );
  }
}
