import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getDevices } from "@/lib/matter/devices";

// 라이브 WebSocket 연결을 사용하므로 항상 요청 시점에 서버에서 실행한다.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const devices = await getDevices();
    return NextResponse.json(devices);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "기기 목록을 불러오지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
