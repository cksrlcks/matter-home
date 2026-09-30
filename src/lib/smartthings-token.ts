// SmartThings OAuth 토큰 응답을 저장할 값으로 바꾸는 순수 함수.
// server-only를 붙이지 않는다(scripts/check-smartthings-token.ts에서 직접 실행).

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  /** 초 단위 */
  expires_in: number;
};

export type TokenRow = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

// 요청 도중 만료되지 않도록 5분 여유를 두고 갱신한다.
const REFRESH_MARGIN_MS = 5 * 60_000;

export function needsRefresh(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() - now.getTime() < REFRESH_MARGIN_MS;
}

// 갱신 응답에 refresh_token이 없으면 기존 값을 계속 쓴다.
export function toTokenRow(
  res: TokenResponse,
  prevRefresh: string | null,
  now: Date,
): TokenRow {
  const refreshToken = res.refresh_token ?? prevRefresh;
  if (!refreshToken) throw new Error("SmartThings 응답에 refresh_token이 없습니다.");
  return {
    accessToken: res.access_token,
    refreshToken,
    expiresAt: new Date(now.getTime() + res.expires_in * 1000),
  };
}
