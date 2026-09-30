import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  AUTHORIZE_URL,
  OAUTH_STATE_COOKIE,
  oauthConfig,
  SCOPES,
} from "@/lib/smartthings-auth";

export const dynamic = "force-dynamic";

// SmartThings 로그인·권한 동의 화면으로 보낸다. state는 콜백에서 CSRF 확인용.
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const { clientId, redirectUri } = oauthConfig();
  const state = randomBytes(16).toString("hex");
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  }).toString();

  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/smartthings/oauth",
    maxAge: 600,
  });
  return response;
}
