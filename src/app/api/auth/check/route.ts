import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Traefik forwardAuth 용. go2rtc(/go2rtc/*) 요청을 로그인한 사용자에게만 통과시킨다.
// (/api/auth/* 는 proxy에서 열어두므로 여기서 직접 세션을 확인한다)
export async function GET() {
  return new Response(null, { status: (await getSession()) ? 200 : 401 });
}
