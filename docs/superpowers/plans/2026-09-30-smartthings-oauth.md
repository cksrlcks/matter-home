# SmartThings OAuth 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** env PAT(`SMARTTHINGS_TOKEN`)를 OAuth(access + refresh token)로 바꾼다. 토큰은 앱이 DB에 보관하고 알아서 갱신하며, go2rtc는 앱 엔드포인트에서 토큰을 받는다.

**Architecture:** 웹에서 "SmartThings 연결"을 누르면 OAuth Authorization Code 흐름을 거쳐 `smartthings_tokens` 테이블(한 줄)에 토큰이 저장된다. `getAccessToken()`은 메모리 캐시 → DB → 만료가 가까우면 `SELECT … FOR UPDATE`로 잠근 뒤 refresh하는 순서로 동작한다. `src/lib/smartthings.ts`의 모든 호출이 이 함수를 거친다. go2rtc 스크립트는 공유 비밀키로 보호된 `GET /api/smartthings/token`을 호출한다.

**Tech Stack:** Next.js 16.3 (App Router, route handlers, `src/proxy.ts`), drizzle-orm 0.45 + postgres-js, Node 22.18(type stripping으로 `.ts` 셀프 체크 실행).

**Spec:** `docs/superpowers/specs/2026-09-30-smartthings-oauth-design.md`

## Global Constraints

- 모든 사용자 노출 문구와 코드 주석은 한국어로 쓰고, 기존 파일의 주석 밀도와 말투를 따른다.
- OAuth 엔드포인트: authorize `https://api.smartthings.com/oauth/authorize`, token `https://api.smartthings.com/oauth/token`
- 토큰 요청: `Authorization: Basic base64(client_id:client_secret)`, `Content-Type: application/x-www-form-urlencoded`
- scope: `r:devices:* x:devices:*`
- 갱신 여유: 만료 5분 전부터 refresh
- 토큰 행 id는 `1`로 고정한다(한 줄만).
- env 이름: `SMARTTHINGS_CLIENT_ID`, `SMARTTHINGS_CLIENT_SECRET`, `SMARTTHINGS_REDIRECT_URI`, `SMARTTHINGS_TOKEN_SECRET`. `SMARTTHINGS_TOKEN`은 삭제한다.
- 연결 필요 오류는 `Object.assign(new Error("SmartThings 연결이 필요합니다."), { status: 401 })` 하나로 통일한다.
- `SMARTTHINGS_TOKEN_SECRET`이 32자 미만이면 토큰 엔드포인트는 항상 401을 돌려준다.
- 새 의존성은 추가하지 않는다.
- 커밋은 main에 직접 하고, 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`를 붙인다.

## Review Focus

1. **refresh 응답에 `refresh_token`이 없는 경우:** 기존 refresh token을 유지해야 한다. 누락되면 다음 갱신 때 연결이 끊긴다. → Task 1 셀프 체크
2. **여러 요청이 동시에 만료 토큰을 만난 경우:** refresh는 한 번만 일어나야 한다(인스턴스 안에서는 Promise 공유, 인스턴스 사이에서는 행 잠금). 두 번 일어나면 refresh token이 회전하면서 한쪽이 무효가 된다. → Task 2 Step 6 수동 확인
3. **연결 직후 이전 실패가 30초 캐시에 남은 경우:** 콜백에서 `clearCaches()`를 불러야 한다. 안 그러면 방금 연결했는데도 "연결 필요"가 계속 보인다. → Task 3 Step 4 수동 확인
4. **토큰 엔드포인트에 틀린 비밀키, 길이만 다른 헤더, 비밀키 env 미설정으로 요청하는 경우:** 전부 401이어야 하고 예외가 나면 안 된다(`timingSafeEqual`은 길이가 다르면 throw한다). → Task 4 Step 3 curl 확인
5. **SmartThings 5xx나 네트워크 오류로 refresh가 실패한 경우:** "연결 필요"(재로그인 유도)가 아니라 일반 오류로 보여야 한다. → Task 2 코드의 status 분기와 Task 2 Step 6

---

## File Structure

| 파일 | 역할 |
|---|---|
| Create `src/lib/smartthings-token.ts` | 순수 함수: `needsRefresh`, `toTokenRow`, 타입. server-only 없음(셀프 체크에서 import) |
| Create `scripts/check-smartthings-token.ts` | 위 순수 함수의 assert 셀프 체크 |
| Modify `tsconfig.json` | `allowImportingTsExtensions: true` 추가(셀프 체크의 `.ts` 확장자 import용, noEmit이라 무해) |
| Modify `src/lib/db/schema.ts` | `smartthingsTokens` 테이블 |
| Create `drizzle/0003_smartthings_tokens.sql` 외 meta | drizzle-kit이 생성 |
| Create `src/lib/smartthings-auth.ts` | server-only. OAuth 설정, 코드 교환, `getAccessToken` |
| Modify `src/lib/smartthings.ts` | 토큰 출처 교체, `clearCaches()` 추가, 주석 수정 |
| Create `src/app/api/smartthings/oauth/start/route.ts` | 인가 화면으로 리다이렉트 |
| Create `src/app/api/smartthings/oauth/callback/route.ts` | state 확인, 코드 교환, 리다이렉트 |
| Create `src/app/api/smartthings/token/route.ts` | go2rtc용 토큰 엔드포인트 |
| Modify `src/proxy.ts` | `/api/smartthings/token`만 세션 검사 제외 |
| Create `src/components/smartthings-connect.tsx` | 연결 안내와 버튼 |
| Modify `src/app/(app)/devices/smartthings/page.tsx` | 401이면 연결 버튼, `st_error` 표시 |
| Modify `src/app/(app)/devices/smartthings/[deviceId]/page.tsx` | 401이면 연결 버튼 |
| Modify `src/app/(app)/page.tsx` | 401 문구 |
| Modify `.env.example`, `docker-compose.yml` | env 교체 |

---

### Task 1: 토큰 순수 로직 + 셀프 체크

**Files:**
- Create: `src/lib/smartthings-token.ts`
- Create: `scripts/check-smartthings-token.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Produces:
  - `type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number }`
  - `type TokenRow = { accessToken: string; refreshToken: string; expiresAt: Date }`
  - `needsRefresh(expiresAt: Date, now: Date): boolean`: 남은 시간이 5분 미만이면 true
  - `toTokenRow(res: TokenResponse, prevRefresh: string | null, now: Date): TokenRow`: `refresh_token`이 없으면 `prevRefresh`를 쓰고, 둘 다 없으면 throw

- [ ] **Step 1: 실패하는 셀프 체크 작성**

`scripts/check-smartthings-token.ts`:

```ts
// SmartThings 토큰 갱신 판단 셀프 체크. 실행: node scripts/check-smartthings-token.ts
import assert from "node:assert/strict";

import { needsRefresh, toTokenRow } from "../src/lib/smartthings-token.ts";

const now = new Date("2026-09-30T00:00:00Z");
const min = 60_000;

// 만료 5분 전부터 갱신
assert.equal(needsRefresh(new Date(now.getTime() + 10 * min), now), false);
assert.equal(needsRefresh(new Date(now.getTime() + 5 * min), now), false);
assert.equal(needsRefresh(new Date(now.getTime() + 5 * min - 1), now), true);
assert.equal(needsRefresh(new Date(now.getTime() - min), now), true);

// expires_in(초) → 만료 시각
const row = toTokenRow(
  { access_token: "a1", refresh_token: "r2", expires_in: 86_399 },
  "r1",
  now,
);
assert.deepEqual(row, {
  accessToken: "a1",
  refreshToken: "r2",
  expiresAt: new Date(now.getTime() + 86_399_000),
});

// 응답에 refresh_token이 없으면 기존 값 유지
assert.equal(
  toTokenRow({ access_token: "a1", expires_in: 60 }, "r1", now).refreshToken,
  "r1",
);

// 둘 다 없으면 저장할 수 없다
assert.throws(() => toTokenRow({ access_token: "a1", expires_in: 60 }, null, now));

console.log("smartthings-token: ok");
```

- [ ] **Step 2: 실패 확인**

Run: `node scripts/check-smartthings-token.ts`
Expected: FAIL. `ERR_MODULE_NOT_FOUND`(`smartthings-token.ts` 없음). Node가 `.ts`를 실행하지 못하면 `node --experimental-strip-types scripts/check-smartthings-token.ts`로 실행한다.

- [ ] **Step 3: 구현**

`src/lib/smartthings-token.ts`:

```ts
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
```

`tsconfig.json`의 `compilerOptions`에서 `"noEmit": true,` 다음 줄에 추가한다:

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Step 4: 통과 확인**

Run: `node scripts/check-smartthings-token.ts`
Expected: `smartthings-token: ok` (ExperimentalWarning이 함께 나와도 무방)

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add src/lib/smartthings-token.ts scripts/check-smartthings-token.ts tsconfig.json
git commit -m "feat: add SmartThings token refresh helpers with self-check"
```

---

### Task 2: 토큰 테이블 + `getAccessToken` + smartthings.ts 교체

**Files:**
- Modify: `src/lib/db/schema.ts` (끝에 추가)
- Create: `drizzle/0003_smartthings_tokens.sql`, `drizzle/meta/0003_snapshot.json`, `drizzle/meta/_journal.json` 수정 (drizzle-kit 생성)
- Create: `src/lib/smartthings-auth.ts`
- Modify: `src/lib/smartthings.ts:20-36` (stFetch), `:176-194` (fetchCameraMedia), `:103-104` (주석), 캐시 선언부 아래에 `clearCaches`
- Modify: `.env.example`, `docker-compose.yml`

**Interfaces:**
- Consumes: Task 1의 `needsRefresh`, `toTokenRow`, `TokenResponse`, `TokenRow`
- Produces:
  - `smartthings-auth.ts`
    - `AUTHORIZE_URL: string`
    - `SCOPES: string`
    - `OAUTH_STATE_COOKIE = "st_oauth_state"`
    - `oauthConfig(): { clientId: string; clientSecret: string; redirectUri: string }`: 하나라도 없으면 throw
    - `exchangeCode(code: string): Promise<void>`
    - `getAccessToken(): Promise<string>`: 연결 필요 시 `status: 401` 오류
  - `smartthings.ts`: `clearCaches(): void`

- [ ] **Step 1: 스키마 추가**

`src/lib/db/schema.ts` 끝에:

```ts
// SmartThings OAuth 토큰. 집 전체가 계정 하나를 쓰므로 id=1 한 줄만 둔다.
export const smartthingsTokens = pgTable("smartthings_tokens", {
  id: integer("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

(`integer`, `text`, `timestamp`, `pgTable`은 이미 import되어 있다.)

- [ ] **Step 2: 마이그레이션 생성**

Run: `npm run db:generate -- --name smartthings_tokens`
Expected: `drizzle/0003_smartthings_tokens.sql`이 생기고 내용에 `CREATE TABLE "smartthings_tokens"`가 있다. 앱이 기동될 때 `runMigrations()`로 적용된다.

- [ ] **Step 3: `src/lib/smartthings-auth.ts` 작성**

```ts
import "server-only";

import { eq } from "drizzle-orm";

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
  });
  if (!res.ok) {
    throw Object.assign(new Error(`SmartThings 토큰 요청 실패 (${res.status})`), {
      status: res.status,
    });
  }
  return res.json();
}

// 매 요청마다 DB를 읽지 않도록 현재 토큰을 메모리에 둔다.
let memo: TokenRow | null = null;
// 같은 인스턴스에서 동시에 만료를 만나도 갱신은 한 번만 한다.
let pending: Promise<string> | null = null;

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
  memo = row;
}

export function getAccessToken(): Promise<string> {
  if (memo && !needsRefresh(memo.expiresAt, new Date())) {
    return Promise.resolve(memo.accessToken);
  }
  pending ??= loadOrRefresh().finally(() => {
    pending = null;
  });
  return pending;
}

async function loadOrRefresh(): Promise<string> {
  return getDb().transaction(async (tx) => {
    // 운영/dev가 같은 DB를 쓰므로 행을 잠가 동시에 갱신하지 않게 한다.
    // 잠금을 기다리는 사이 다른 쪽이 갱신했으면 그 값을 그대로 쓴다.
    const [row] = await tx
      .select()
      .from(smartthingsTokens)
      .where(eq(smartthingsTokens.id, ROW_ID))
      .for("update");
    if (!row) throw notConnected();

    if (!needsRefresh(row.expiresAt, new Date())) {
      memo = row;
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
    memo = next;
    return next.accessToken;
  });
}
```

- [ ] **Step 4: `src/lib/smartthings.ts` 교체**

import 추가(`import "server-only";` 아래):

```ts
import { getAccessToken } from "@/lib/smartthings-auth";
```

첫 주석 `// SmartThings 클라우드 API 호출. 토큰은 server-only env.`를 다음으로 바꾼다:

```ts
// SmartThings 클라우드 API 호출. 토큰은 OAuth로 받아 DB에 보관한다(smartthings-auth).
```

`stFetch`의 앞부분

```ts
  const token = process.env.SMARTTHINGS_TOKEN;
  if (!token) throw new Error("SMARTTHINGS_TOKEN 환경변수가 설정되지 않았습니다.");
```

을 다음으로 바꾼다:

```ts
  const token = await getAccessToken();
```

`fetchCameraMedia`의 `Authorization: \`Bearer ${process.env.SMARTTHINGS_TOKEN}\`,`를 다음으로 바꾼다:

```ts
      Authorization: `Bearer ${await getAccessToken()}`,
```

`getCameraStatus` 함수 바로 다음에 추가한다(`deviceCache`와 `statusCache`가 모두 선언된 뒤여야 한다):

```ts
// 연결 직후에는 "연결 필요"로 실패한 결과(30초 재사용)를 비운다.
export function clearCaches(): void {
  deviceCache.clear();
  statusCache.clear();
}
```

카메라 절의 주석

```ts
// 실시간 영상(videoStream)은 인증된 rtsps 주소라 개인 토큰으로는 재생할 수 없어서,
// 스냅샷(imageCapture)과 최근 녹화 클립(videoCapture)만 다룬다.
```

을 다음으로 바꾼다:

```ts
// 실시간 영상(videoStream)은 go2rtc가 따로 받으므로(토큰은 /api/smartthings/token),
// 여기서는 스냅샷(imageCapture)과 최근 녹화 클립(videoCapture)만 다룬다.
```

- [ ] **Step 5: env 파일 교체**

`.env.example`의 SmartThings 블록

```
# ── SmartThings (server-only) ──
# Personal Access Token: https://account.smartthings.com/tokens (devices 읽기 권한)
SMARTTHINGS_TOKEN=
```

을 다음으로 바꾼다:

```
# ── SmartThings OAuth (server-only) ──
# OAuth-In App 등록(1회): npx @smartthings/cli apps:create → "OAuth-In App"
#   redirect URI: https://<APP_HOST>/api/smartthings/oauth/callback, scope: r:devices:* x:devices:*
# 토큰은 앱에서 "SmartThings 연결"을 누르면 DB에 저장되고 자동 갱신된다.
SMARTTHINGS_CLIENT_ID=
SMARTTHINGS_CLIENT_SECRET=
# 등록한 redirect URI와 정확히 같아야 한다.
SMARTTHINGS_REDIRECT_URI=
# go2rtc가 /api/smartthings/token 을 호출할 때 쓰는 비밀키(32자 이상). 생성: openssl rand -hex 32
SMARTTHINGS_TOKEN_SECRET=
```

`docker-compose.yml`의 `SMARTTHINGS_TOKEN: ${SMARTTHINGS_TOKEN}`을 다음으로 바꾼다:

```yaml
      SMARTTHINGS_CLIENT_ID: ${SMARTTHINGS_CLIENT_ID}
      SMARTTHINGS_CLIENT_SECRET: ${SMARTTHINGS_CLIENT_SECRET}
      SMARTTHINGS_REDIRECT_URI: ${SMARTTHINGS_REDIRECT_URI}
      SMARTTHINGS_TOKEN_SECRET: ${SMARTTHINGS_TOKEN_SECRET}
```

같은 파일 상단 주석의 "Dokploy Environment 예시"에 한 줄 추가한다:

```
#   SMARTTHINGS_CLIENT_ID / SMARTTHINGS_CLIENT_SECRET / SMARTTHINGS_REDIRECT_URI / SMARTTHINGS_TOKEN_SECRET
```

- [ ] **Step 6: 확인**

Run: `grep -rn "SMARTTHINGS_TOKEN\b" src .env.example docker-compose.yml`
Expected: 결과 없음(`SMARTTHINGS_TOKEN_SECRET`만 남음)

Run: `npx tsc --noEmit && npm run lint`
Expected: 오류 없음

수동 확인은 Task 3 이후, 연결이 가능해졌을 때 한다(Task 6 Step 3~4).

- [ ] **Step 7: 커밋**

```bash
git add src/lib/db/schema.ts drizzle src/lib/smartthings-auth.ts src/lib/smartthings.ts .env.example docker-compose.yml
git commit -m "feat: store SmartThings OAuth tokens in DB with auto refresh"
```

---

### Task 3: OAuth 시작/콜백 라우트

**Files:**
- Create: `src/app/api/smartthings/oauth/start/route.ts`
- Create: `src/app/api/smartthings/oauth/callback/route.ts`

**Interfaces:**
- Consumes: `AUTHORIZE_URL`, `SCOPES`, `OAUTH_STATE_COOKIE`, `oauthConfig`, `exchangeCode` (Task 2), `clearCaches` (Task 2), `getSession` (`@/lib/auth/session`)
- Produces: `GET /api/smartthings/oauth/start`, `GET /api/smartthings/oauth/callback`. 실패하면 `/devices/smartthings?st_error=1`로 보낸다.

- [ ] **Step 1: start 라우트**

```ts
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
```

- [ ] **Step 2: callback 라우트**

```ts
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
```

- [ ] **Step 3: 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 오류 없음

Run(dev 서버 실행 중, 로그인 쿠키 없이): `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/smartthings/oauth/callback?state=x`
Expected: `401` (proxy가 차단)

- [ ] **Step 4: 수동 확인 (Task 6의 사전 준비를 마친 뒤)**

1. SmartThings 탭을 먼저 한 번 열어 "연결 필요"를 캐시에 남긴다.
2. 브라우저에서 로그인한 상태로 `/api/smartthings/oauth/start`로 이동 → SmartThings 로그인 → 동의 → `/devices/smartthings`로 돌아오는지 확인한다.
3. 돌아오자마자 기기 목록이 바로 보이는지 확인한다(30초를 기다릴 필요가 없어야 함 = `clearCaches` 동작).
4. `/api/smartthings/oauth/callback?state=wrong`을 직접 열면 400이 나오는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/smartthings/oauth
git commit -m "feat: add SmartThings OAuth start and callback routes"
```

---

### Task 4: go2rtc용 토큰 엔드포인트

**Files:**
- Create: `src/app/api/smartthings/token/route.ts`
- Modify: `src/proxy.ts:12-15`

**Interfaces:**
- Consumes: `getAccessToken` (Task 2)
- Produces: `GET /api/smartthings/token`. 비밀키가 맞으면 200 text/plain(토큰), 비밀키 오류는 401, 미연결·갱신 실패는 503.

- [ ] **Step 1: 라우트 작성**

```ts
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
```

- [ ] **Step 2: proxy 예외 추가**

`src/proxy.ts`의

```ts
  // 로그인/로그아웃 API는 항상 열어둔다.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
```

을 다음으로 바꾼다:

```ts
  // 로그인/로그아웃 API와 go2rtc 토큰 API(비밀키로 직접 검사)는 항상 열어둔다.
  if (pathname.startsWith("/api/auth") || pathname === "/api/smartthings/token") {
    return NextResponse.next();
  }
```

- [ ] **Step 3: 확인 (dev 서버, `.env.local`에 `SMARTTHINGS_TOKEN_SECRET`=32자 이상 설정)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/smartthings/token
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer wrong" http://localhost:3000/api/smartthings/token
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <SECRET>" http://localhost:3000/api/smartthings/token
```

Expected: `401`, `401`, 그리고 연결 전이면 `503`, 연결 후면 `200`(본문은 토큰). 서버 로그에 비밀키 비교로 인한 예외가 없어야 한다.

Run: `npx tsc --noEmit && npm run lint`
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/smartthings/token src/proxy.ts
git commit -m "feat: expose SmartThings access token to go2rtc via shared secret"
```

---

### Task 5: 연결 버튼 UI

**Files:**
- Create: `src/components/smartthings-connect.tsx`
- Modify: `src/app/(app)/devices/smartthings/page.tsx`
- Modify: `src/app/(app)/devices/smartthings/[deviceId]/page.tsx:40-45`
- Modify: `src/app/(app)/page.tsx:31-37`

**Interfaces:**
- Consumes: `buttonClassName` (`@/components/ui/button`), `Card` (`@/components/ui/card`). 오류의 `status === 401`
- Produces: `<SmartThingsConnect failed?: boolean />`

- [ ] **Step 1: 컴포넌트**

`src/components/smartthings-connect.tsx`:

```tsx
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 토큰이 없거나 만료되면 SmartThings 로그인으로 보낸다.
// API 라우트로 이동해 외부로 리다이렉트되므로 <Link>가 아닌 <a>를 쓴다.
export function SmartThingsConnect({ failed = false }: { failed?: boolean }) {
  return (
    <Card className="flex flex-col items-start gap-3 p-5">
      <p className="text-sm text-muted-foreground">
        {failed
          ? "SmartThings 연결에 실패했습니다. 다시 시도해 주세요."
          : "SmartThings 계정 연결이 필요합니다."}
      </p>
      <a href="/api/smartthings/oauth/start" className={buttonClassName()}>
        SmartThings 연결
      </a>
    </Card>
  );
}
```

- [ ] **Step 2: 목록 페이지**

`src/app/(app)/devices/smartthings/page.tsx`:

import에 `import { SmartThingsConnect } from "@/components/smartthings-connect";`를 추가한다(`DashboardControl` import 다음).

함수 시그니처를 바꾼다:

```tsx
export default async function SmartThingsDevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ st_error?: string }>;
}) {
  await connection();
  const { st_error } = await searchParams;
```

`let error: string | null = null;` 다음 줄에 추가한다:

```tsx
  let needsConnect = false;
```

catch 블록을 바꾼다:

```tsx
  } catch (e) {
    needsConnect = (e as { status?: number }).status === 401;
    error = e instanceof Error ? e.message : "알 수 없는 오류";
  }
```

return의 첫 분기 `{error ? (`를 다음으로 바꾼다:

```tsx
      {needsConnect || st_error ? (
        <SmartThingsConnect failed={!!st_error} />
      ) : error ? (
```

(`st_error`가 있어도 목록 대신 연결 카드를 보여준다. 실패 직후에는 보통 미연결 상태이기 때문이다.)

- [ ] **Step 3: 카메라 상세 페이지**

import에 `import { SmartThingsConnect } from "@/components/smartthings-connect";`를 추가한다.

```tsx
  const device = await getDevice(deviceId).catch((e: { status?: number }) => {
    if (e.status === 404 || e.status === 403) return null;
    throw e;
  });
  if (!device || !isCamera(device)) notFound();
```

를 다음으로 바꾼다:

```tsx
  const device = await getDevice(deviceId).catch((e: { status?: number }) => {
    if (e.status === 404 || e.status === 403) return null;
    if (e.status === 401) return "disconnected" as const;
    throw e;
  });
  if (device === "disconnected") return <SmartThingsConnect />;
  if (!device || !isCamera(device)) notFound();
```

- [ ] **Step 4: 메인 대시보드 문구**

`src/app/(app)/page.tsx`의 `loadSmartThings` catch를 바꾼다:

```tsx
    return {
      error:
        status === 401
          ? "SmartThings 연결이 필요합니다."
          : status === 404 || status === 403
            ? "SmartThings에서 찾을 수 없는 기기입니다."
            : "SmartThings 기기를 불러오지 못했습니다.",
    };
```

- [ ] **Step 5: 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 모두 성공

수동(연결 전 상태, DB에 토큰 행 없음):
- `/devices/smartthings` → "SmartThings 계정 연결이 필요합니다." 카드와 버튼
- `/devices/smartthings?st_error=1` → "연결에 실패했습니다" 카드
- 카메라 상세 URL → 연결 카드
- 메인에 SmartThings 기기가 있으면 "SmartThings 연결이 필요합니다." 카드

- [ ] **Step 6: 커밋**

```bash
git add src/components/smartthings-connect.tsx "src/app/(app)"
git commit -m "feat: show SmartThings connect button when not connected"
```

---

### Task 6: 등록·배포·go2rtc 적용 (사용자 수행 + 최종 확인)

코드 변경은 없다. 사용자가 직접 하는 단계와 최종 검증이다.

- [ ] **Step 1: OAuth-In App 등록 (1회)**

기본 방법:

```bash
npx @smartthings/cli apps:create
```

- 앱 종류: **OAuth-In App**
- Display name: `Matter Home`
- Target URL: 비워 둠
- Scopes: `r:devices:*`, `x:devices:*`
- Redirect URI: `https://<APP_HOST>/api/smartthings/oauth/callback`
- 출력되는 **OAuth Client Id / Client Secret**을 바로 복사한다(secret은 이때 한 번만 보여줌).

CLI가 안 될 때의 대안(웹에서 새 PAT 발급 후, PAT는 이 요청에만 사용):

```bash
curl -s -X POST https://api.smartthings.com/v1/apps \
  -H "Authorization: Bearer <새 PAT>" -H "Content-Type: application/json" \
  -d '{
    "appName": "matter-home-oauth",
    "displayName": "Matter Home",
    "description": "matter-home 웹 앱 연동",
    "appType": "API_ONLY",
    "classifications": ["CONNECTED_SERVICE"],
    "singleInstance": true,
    "apiOnly": {},
    "oauth": {
      "clientName": "Matter Home",
      "scope": ["r:devices:*", "x:devices:*"],
      "redirectUris": ["https://<APP_HOST>/api/smartthings/oauth/callback"]
    }
  }'
```

응답의 `oauthClientId`, `oauthClientSecret`을 쓴다.

- [ ] **Step 2: env 설정**

Dokploy(앱)과 `.env.local`(dev)에 설정한다. dev도 같은 DB를 쓰므로 CLIENT_ID/SECRET은 같은 값을 쓴다. dev에서 연결 버튼을 누를 일은 없다(운영에서 연결하면 dev도 같은 토큰을 씀).

```
SMARTTHINGS_CLIENT_ID=<Client Id>
SMARTTHINGS_CLIENT_SECRET=<Client Secret>
SMARTTHINGS_REDIRECT_URI=https://<APP_HOST>/api/smartthings/oauth/callback
SMARTTHINGS_TOKEN_SECRET=<openssl rand -hex 32>
```

기존 `SMARTTHINGS_TOKEN`은 삭제한다. 배포 후 로그에 `[db] 마이그레이션 완료`가 찍히는지 확인한다.

- [ ] **Step 3: 연결 확인**

1. 운영 `/devices/smartthings` → "SmartThings 연결" → 로그인·동의 → 기기 목록이 보이는지 확인
2. DB: `select id, expires_at, updated_at from smartthings_tokens;` → 한 줄, `expires_at`이 약 24시간 뒤

- [ ] **Step 4: 갱신 확인**

1. `update smartthings_tokens set expires_at = now() - interval '1 minute';`
2. 메모리 캐시를 비우려고 앱을 재시작하고, SmartThings 탭을 새로고침한다.
3. 목록이 정상으로 보이고 `updated_at`, `expires_at`이 새 값으로 바뀌었는지 확인한다.
4. 여러 탭(목록과 카메라 상세)을 동시에 새로고침해도 목록이 정상이고, 한 번 더 확인했을 때 `updated_at`이 한 번만 바뀌었는지 본다(Review Focus 2).

- [ ] **Step 5: go2rtc 적용 (go2rtc compose, 레포 밖)**

`environment`를 바꾼다:

```yaml
    environment:
      SMARTTHINGS_TOKEN_SECRET: ${SMARTTHINGS_TOKEN_SECRET}
      APP_HOST: ${APP_HOST}
```

`smartthings-stream.sh`의 `set -eu` 다음 줄에 추가한다(나머지는 그대로):

```sh
      # 토큰은 앱이 보관·갱신한다. 현재 access token만 받아 쓴다.
      SMARTTHINGS_TOKEN=$$(curl -sf -H "Authorization: Bearer $$SMARTTHINGS_TOKEN_SECRET" "https://$$APP_HOST/api/smartthings/token")
```

재배포한 뒤 카메라 상세에서 실시간 영상이 재생되는지 확인한다.

- [ ] **Step 6: 최종 검증**

```bash
node scripts/check-smartthings-token.ts
npx tsc --noEmit
npm run lint
npm run build
```

Expected: 모두 성공
