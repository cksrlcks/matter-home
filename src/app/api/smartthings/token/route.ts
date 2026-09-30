import { timingSafeEqual } from "node:crypto";

import { getAccessToken } from "@/lib/smartthings-auth";

export const dynamic = "force-dynamic";

// go2rtc 스트림 스크립트용. 공유 비밀키를 가진 호출에만 현재 access token을 내준다.
// (세션이 없는 호출이라 proxy에서 이 경로만 열어두고 여기서 직접 검사한다)
function authorized(header: string | null): boolean {
  const secret = process.env.SMARTTHINGS_TOKEN_SECRET;
  if (!secret || secret.length < 32 || !header) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  // timingSafeEqual은 길이가 다르면 throw하므로 먼저 비교한다.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }
  try {
    return new Response(await getAccessToken(), {
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  } catch (error) {
    // 비밀키 오류(401)와 구분되도록 미연결·갱신 실패는 503으로 돌려준다.
    console.error("[smartthings] go2rtc 토큰 요청 실패:", error);
    return new Response(null, { status: 503 });
  }
}
