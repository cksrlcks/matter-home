import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import {
  getWifiCredentials,
  removeWifiCredentials,
  setWifiCredentials,
} from "@/lib/matter/wifi";

export const dynamic = "force-dynamic";

// SSID는 최대 32바이트, WPA 비밀번호는 8~63자(또는 64자리 hex). 개방형 네트워크는 빈 값.
const wifiSchema = z.object({
  ssid: z.string().trim().min(1, "Wi-Fi 이름(SSID)을 입력해주세요.").max(32),
  password: z.string().max(64),
});

function unauthorized() {
  return NextResponse.json(
    { success: false, message: "인증이 필요합니다." },
    { status: 401 },
  );
}

function failure(error: unknown, fallback: string) {
  return NextResponse.json(
    {
      success: false,
      message: error instanceof Error ? error.message : fallback,
    },
    { status: 502 },
  );
}

// 저장된 Wi-Fi(SSID만) 조회
export async function GET() {
  if (!(await getSession())) return unauthorized();
  try {
    return NextResponse.json(await getWifiCredentials());
  } catch (error) {
    return failure(error, "Wi-Fi 설정을 불러오지 못했습니다.");
  }
}

// Wi-Fi 저장 (matter-server로 전달만 한다)
export async function PUT(request: NextRequest) {
  if (!(await getSession())) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = wifiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  try {
    await setWifiCredentials(parsed.data.ssid, parsed.data.password);
    return NextResponse.json({ success: true, ssid: parsed.data.ssid });
  } catch (error) {
    return failure(error, "Wi-Fi 저장에 실패했습니다.");
  }
}

// 저장된 Wi-Fi 삭제
export async function DELETE() {
  if (!(await getSession())) return unauthorized();
  try {
    await removeWifiCredentials();
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error, "Wi-Fi 삭제에 실패했습니다.");
  }
}
