// 임시 인증 설정. 계정은 env로 하드코딩
// 추후 실제 인증(Better Auth / Cloudflare Access 등)으로 대체 예정.

export const AUTH_COOKIE = "mh_session";

// 세션 유효기간 (7일)
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length > 0) return secret;
  // dev 폴백. 프로덕션에서는 반드시 AUTH_SECRET을 설정한다.
  return "matter-home-dev-secret-change-me";
}

export function verifyCredentials(username: string, password: string): boolean {
  // 자격증명은 환경변수로만 주입한다. (레포에 아이디/비밀번호를 남기지 않는다)
  // AUTH_PASSWORD가 비어 있으면 로그인은 비활성화된다(fail closed).
  const expectedUser = process.env.AUTH_USERNAME ?? "admin";
  const expectedPass = process.env.AUTH_PASSWORD ?? "";
  return (
    expectedPass.length > 0 &&
    username === expectedUser &&
    password === expectedPass
  );
}
