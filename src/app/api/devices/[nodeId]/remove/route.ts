import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { removeDevice } from "@/lib/matter/devices";

export const dynamic = "force-dynamic";

// 기기 제거 (fabric에서 decommission).
// 이름 초기화(DELETE /api/devices/[nodeId])와 구분하기 위해 별도 경로/POST로 둔다.
export async function POST(
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
    await removeDevice(nodeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "기기 제거에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
