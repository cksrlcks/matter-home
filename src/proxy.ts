import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/token";

// Next.js 16: middleware → proxy 로 이름이 바뀌었고 Node.js runtime에서 동작한다.
// 이건 첫 번째 방어선일 뿐이며, 실제 인가 검증은 각 route handler에서도 다시 수행한다.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 로그인/로그아웃 API는 항상 열어둔다.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const isLoginPage = pathname === "/login";

  if (!session) {
    if (isLoginPage) return NextResponse.next();
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 이미 로그인 상태면 로그인 페이지 접근 시 홈으로 보낸다.
  if (isLoginPage) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  // 로컬 dev의 go2rtc 프록시(next.config rewrites)는 Host를 go2rtc 주소로 바꾸므로,
  // go2rtc가 Origin 불일치로 WebSocket을 403 거부한다. 로그인 확인을 마친 dev 요청만 Origin을 뺀다.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.GO2RTC_DEV_URL &&
    pathname.startsWith("/go2rtc/")
  ) {
    const headers = new Headers(request.headers);
    headers.delete("origin");
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  // 정적 자원은 제외하고 나머지 모든 경로에 적용한다.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
