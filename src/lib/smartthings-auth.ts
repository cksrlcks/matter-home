import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { smartthingsTokens } from "@/lib/db/schema";
import {
  needsRefresh,
  toTokenRow,
  type TokenResponse,
  type TokenRow,
} from "@/lib/smartthings-token";

// SmartThings OAuth(Authorization Code). 토큰은 DB 한 줄에 두고 앱만 갱신한다.
// (go2rtc는 /api/smartthings/token 으로 받아 쓴다. 두 곳에서 갱신하면 refresh token이 서로 무효화될 수 있음)
export const AUTHORIZE_URL = "https://api.smartthings.com/oauth/authorize";
const TOKEN_URL = "https://api.smartthings.com/oauth/token";
export const SCOPES = "r:devices:* x:devices:*";
export const OAUTH_STATE_COOKIE = "st_oauth_state";

const ROW_ID = 1;

const notConnected = () =>
  Object.assign(new Error("SmartThings 연결이 필요합니다."), { status: 401 });

export function oauthConfig() {
  const clientId = process.env.SMARTTHINGS_CLIENT_ID;
  const clientSecret = process.env.SMARTTHINGS_CLIENT_SECRET;
  const redirectUri = process.env.SMARTTHINGS_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "SMARTTHINGS_CLIENT_ID / SMARTTHINGS_CLIENT_SECRET / SMARTTHINGS_REDIRECT_URI 환경변수가 설정되지 않았습니다.",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = oauthConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ ...params, client_id: clientId }),
    cache: "no-store",
    // 갱신은 행 잠금을 쥔 채 호출하므로 오래 매달리지 않게 한다.
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`SmartThings 토큰 요청 실패 (${res.status})`), {
      status: res.status,
    });
  }
  return res.json();
}

// 매 요청마다 DB를 읽지 않도록 현재 토큰을 메모리에 둔다.
// 같은 인스턴스에서 동시에 만료를 만나도 갱신은 한 번만 한다(pending).
// Next.js는 페이지와 API 라우트를 따로 번들링해 모듈 변수가 둘로 나뉜다.
// 콜백(라우트)에서 바꾼 토큰을 페이지도 보도록 globalThis에 둔다.
type StAuthStore = { memo: TokenRow | null; pending: Promise<string> | null };
const store = ((globalThis as { __stAuth?: StAuthStore }).__stAuth ??= {
  memo: null,
  pending: null,
});

export async function exchangeCode(code: string): Promise<void> {
  const { redirectUri } = oauthConfig();
  const res = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const row = toTokenRow(res, null, new Date());
  await getDb()
    .insert(smartthingsTokens)
    .values({ id: ROW_ID, ...row })
    .onConflictDoUpdate({
      target: smartthingsTokens.id,
      set: { ...row, updatedAt: new Date() },
    });
  store.memo = row;
}

export function getAccessToken(): Promise<string> {
  if (store.memo && !needsRefresh(store.memo.expiresAt, new Date())) {
    return Promise.resolve(store.memo.accessToken);
  }
  store.pending ??= loadOrRefresh().finally(() => {
    store.pending = null;
  });
  return store.pending;
}

async function loadOrRefresh(): Promise<string> {
  // 아직 유효하면 잠그지 않고 읽기만 한다.
  const [current] = await getDb()
    .select()
    .from(smartthingsTokens)
    .where(eq(smartthingsTokens.id, ROW_ID));
  if (!current) throw notConnected();
  if (!needsRefresh(current.expiresAt, new Date())) {
    store.memo = current;
    return current.accessToken;
  }

  return getDb().transaction(async (tx) => {
    // 상대 인스턴스가 잠금을 쥔 채 멈춰도(dev 노트북 절전 등) 무한정 기다리지 않는다.
    await tx.execute(sql`set local lock_timeout = '10s'`);
    // 운영/dev가 같은 DB를 쓰므로 행을 잠가 동시에 갱신하지 않게 한다.
    // 잠금을 기다리는 사이 다른 쪽이 갱신했으면 그 값을 그대로 쓴다.
    const [row] = await tx
      .select()
      .from(smartthingsTokens)
      .where(eq(smartthingsTokens.id, ROW_ID))
      .for("update");
    if (!row) throw notConnected();

    if (!needsRefresh(row.expiresAt, new Date())) {
      store.memo = row;
      return row.accessToken;
    }

    // 400/401은 refresh token 만료·해제 → 다시 연결해야 한다. 그 밖의 오류는 그대로 올린다.
    const res = await requestToken({
      grant_type: "refresh_token",
      refresh_token: row.refreshToken,
    }).catch((e: { status?: number }) => {
      throw e.status === 400 || e.status === 401 ? notConnected() : e;
    });
    const next = toTokenRow(res, row.refreshToken, new Date());
    await tx
      .update(smartthingsTokens)
      .set({ ...next, updatedAt: new Date() })
      .where(eq(smartthingsTokens.id, ROW_ID));
    store.memo = next;
    return next.accessToken;
  });
}
