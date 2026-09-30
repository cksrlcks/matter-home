import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { clearCaches } from "@/lib/smartthings";
import { exchangeCode, OAUTH_STATE_COOKIE } from "@/lib/smartthings-auth";

export const dynamic = "force-dynamic";

// SmartThings가 code를 붙여 돌려보내는 곳. state를 확인하고 토큰으로 교환한다.
// 앱이 Traefik 뒤에 있어 요청 origin을 믿을 수 없으므로 상대 경로로 리다이렉트한다.
export async function GET(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const expected = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  // 사용자가 동의를 거부하면 code 없이 error만 온다.
  const code = params.get("code");
  let ok = false;
  if (code) {
    try {
      await exchangeCode(code);
      clearCaches();
      ok = true;
    } catch (error) {
      console.error("[smartthings] 토큰 교환 실패:", error);
    }
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: ok ? "/devices/smartthings" : "/devices/smartthings?st_error=1",
    },
  });
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: "",
    path: "/api/smartthings/oauth",
    maxAge: 0,
  });
  return response;
}
