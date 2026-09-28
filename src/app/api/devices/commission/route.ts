import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import {
  commissionDevice,
  CommissioningInProgressError,
} from "@/lib/matter/devices";

export const dynamic = "force-dynamic";
// commissioning은 BLE/Thread 조인까지 수 분 걸릴 수 있다.
export const maxDuration = 300;

const commissionSchema = z.object({
  code: z.string().trim().min(8, "Matter 페어링 코드를 확인해주세요."),
});

// 새 Matter 기기 추가 (commissioning)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = commissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message ?? "코드가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  try {
    const device = await commissionDevice(parsed.data.code);
    return NextResponse.json({ success: true, device }, { status: 201 });
  } catch (error) {
    // 이미 커미셔닝 진행 중 → 409 (중복 실행 방지)
    if (error instanceof CommissioningInProgressError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "기기 추가에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
