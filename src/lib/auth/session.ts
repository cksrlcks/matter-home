import { cookies } from "next/headers";

import { AUTH_COOKIE } from "./config";
import { verifySessionToken, type SessionPayload } from "./token";

// Server Component / Route Handler에서 현재 세션을 읽는다.
// (proxy에서는 request.cookies를 쓰므로 token.ts를 직접 사용한다.)
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  return verifySessionToken(token);
}
