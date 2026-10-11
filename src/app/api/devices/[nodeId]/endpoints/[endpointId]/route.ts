import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import {
  deleteEndpointName,
  setEndpointName,
} from "@/lib/db/device-endpoint-names";
import {
  assertSwitchEndpoint,
  UnknownSwitchEndpointError,
} from "@/lib/matter/devices";

export const dynamic = "force-dynamic";

const renameSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(64),
});

const endpointIdSchema = z.coerce.number().int().nonnegative();

type Params = { params: Promise<{ nodeId: string; endpointId: string }> };

function invalidEndpoint() {
  return NextResponse.json(
    { success: false, message: "endpoint가 올바르지 않습니다." },
    { status: 400 },
  );
}

// 스위치(endpoint) 이름 변경 (사용자 지정 이름 저장/수정)
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const { nodeId, endpointId: rawEndpointId } = await params;
  const endpointId = endpointIdSchema.safeParse(rawEndpointId);
  if (!endpointId.success) return invalidEndpoint();

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
    await assertSwitchEndpoint(nodeId, endpointId.data);
    await setEndpointName(nodeId, endpointId.data, parsed.data.name);
    return NextResponse.json({ success: true, name: parsed.data.name });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "이름 변경에 실패했습니다.",
      },
      { status: error instanceof UnknownSwitchEndpointError ? 404 : 502 },
    );
  }
}

// 사용자 지정 이름 삭제 (기본 이름으로 초기화)
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const { nodeId, endpointId: rawEndpointId } = await params;
  const endpointId = endpointIdSchema.safeParse(rawEndpointId);
  if (!endpointId.success) return invalidEndpoint();

  try {
    await deleteEndpointName(nodeId, endpointId.data);
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
