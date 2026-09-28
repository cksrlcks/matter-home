import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  CommissioningInProgressError,
  discoverCommissionableDevices,
} from "@/lib/matter/devices";

export const dynamic = "force-dynamic";
// BLE 스캔 + mDNS 조회는 수십 초 걸릴 수 있다.
export const maxDuration = 90;

// 주변의 commissionable(아직 등록되지 않은) Matter 기기 검색
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const devices = await discoverCommissionableDevices();
    return NextResponse.json(devices);
  } catch (error) {
    if (error instanceof CommissioningInProgressError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "기기 검색에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
