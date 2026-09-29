import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { deleteGroup, renameGroup } from "@/lib/db/dashboard";
import { groupIdSchema, groupNameSchema } from "@/lib/validations/dashboard";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ groupId: string }> };

// 그룹 이름 변경
export async function PATCH(request: NextRequest, { params }: Context) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const id = groupIdSchema.safeParse((await params).groupId);
  const body = groupNameSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !body.success) {
    return NextResponse.json(
      { message: body.error?.issues[0]?.message ?? "요청이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    if (!(await renameGroup(id.data, body.data.name))) {
      return NextResponse.json({ message: "그룹을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ id: id.data, name: body.data.name });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "그룹 이름 변경에 실패했습니다." },
      { status: 502 },
    );
  }
}

// 그룹 삭제 (속한 기기는 메인에 남고 그룹 미지정이 된다)
export async function DELETE(_request: NextRequest, { params }: Context) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const id = groupIdSchema.safeParse((await params).groupId);
  if (!id.success) {
    return NextResponse.json({ message: "요청이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    await deleteGroup(id.data);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "그룹 삭제에 실패했습니다." },
      { status: 502 },
    );
  }
}
