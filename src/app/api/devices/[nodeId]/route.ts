import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { deleteDeviceName, setDeviceName } from "@/lib/db/device-names";

export const dynamic = "force-dynamic";

const renameSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(64),
});

// 기기 이름 변경 (사용자 지정 이름 저장/수정)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const { nodeId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message ?? "이름이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  try {
    await setDeviceName(nodeId, parsed.data.name);
    return NextResponse.json({ success: true, name: parsed.data.name });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "이름 변경에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}

// 사용자 지정 이름 삭제 (Matter 기본 이름으로 초기화)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const { nodeId } = await params;
  try {
    await deleteDeviceName(nodeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "초기화에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
