# SmartThings OAuth 전환 설계

## 배경

- 현재 앱과 go2rtc 스크립트가 env `SMARTTHINGS_TOKEN`(PAT)을 공유한다.
- 2024-12-30 이후 발급된 PAT는 24시간 후 만료되므로 재발급해도 401이 반복된다.
- OAuth-In App으로 전환한다. access token 24시간, refresh token 30일. 갱신 응답의 refresh token으로 교체해야 한다.

## 목표 / 성공 기준

- 앱에서 "SmartThings 연결"을 한 번 하면, 이후 30일 안에 한 번이라도 사용되는 한 401 없이 계속 동작한다.
- go2rtc 실시간 영상도 같은 토큰으로 계속 동작한다.
- 토큰 갱신 주체는 앱 하나뿐이다(두 곳에서 갱신하면 refresh token이 서로 무효화될 수 있음).

## 범위 밖

- `EXTERNAL_MODE`(DB 접근 불가)에서의 SmartThings 동작. 토큰이 DB에 있으므로 연결 필요 상태로 보인다.
- 연결 관리 설정 화면, 연결 해제 버튼.
- go2rtc compose 파일 수정(레포 밖, 변경 내용만 안내).

## 사전 준비 (수동, 1회)

1. OAuth-In App 등록. Developer Workspace(웹)에서는 만들 수 없으므로 명령 한 줄로 처리한다.
   - 기본: `npx @smartthings/cli apps:create`(설치 불필요, CLI 로그인은 브라우저) → **OAuth-In App** 선택
   - 대안: 웹에서 새 PAT를 발급한 뒤 `curl -X POST https://api.smartthings.com/v1/apps`(appType `API_ONLY`, classification `CONNECTED_SERVICE`, `oauth` 블록 포함). 정확한 명령은 구현 계획에 적는다.
   - redirect URI: `https://<APP_HOST>/api/smartthings/oauth/callback`
   - scope: `r:devices:*`, `x:devices:*`
   - client secret은 등록할 때 한 번만 보여주므로 바로 env에 넣는다.
2. env 설정(Dokploy / `.env.local`)
   - `SMARTTHINGS_CLIENT_ID`, `SMARTTHINGS_CLIENT_SECRET`: 1에서 발급
   - `SMARTTHINGS_REDIRECT_URI`: 1에서 등록한 redirect URI 그대로
   - `SMARTTHINGS_TOKEN_SECRET`: go2rtc 공유 비밀키, `openssl rand -hex 32`
   - `SMARTTHINGS_TOKEN` 삭제

dev PC는 운영과 같은 DB를 보므로 운영에서 한 번 연결하면 dev도 같은 토큰을 쓴다.

## 구성

### DB: `smartthings_tokens` (마이그레이션 0003)

한 줄만 쓴다(`id = 1` 고정).

| 컬럼 | 타입 |
|---|---|
| id | integer PK |
| access_token | text not null |
| refresh_token | text not null |
| expires_at | timestamptz not null |
| updated_at | timestamptz not null default now() |

### `src/lib/smartthings-auth.ts` (server-only)

- `getAccessToken(): Promise<string>`
  1. 메모리 캐시가 만료 5분 전보다 이르면 그대로 반환한다.
  2. DB 행을 읽어서 아직 유효하면 캐시하고 반환한다.
  3. 만료가 가까우면 트랜잭션 안에서 `SELECT … FOR UPDATE`로 잠그고 다시 확인한다. 다른 인스턴스가 먼저 갱신했으면 그 값을 쓰고, 아니면 refresh한 뒤 update한다.
  4. 행이 없거나 refresh가 400/401로 거부되면 `status: 401` 오류("SmartThings 연결이 필요합니다.")를 던진다. 네트워크 오류나 5xx는 그대로 던진다(다시 연결할 필요가 없으므로).
- `exchangeCode(code: string): Promise<void>`: authorization_code를 토큰으로 교환하고 upsert한다.
- 토큰 요청은 `POST https://api.smartthings.com/oauth/token`으로 보낸다. `Authorization: Basic base64(client_id:client_secret)`, `application/x-www-form-urlencoded` 형식이다.
  - 코드 교환: `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`
  - 갱신: `grant_type=refresh_token`, `refresh_token`, `client_id`
- 순수 함수(테스트 대상):
  - `needsRefresh(expiresAt, now)`: 만료 5분 전부터 true
  - `toTokenRow(response, prevRefresh, now)`: `expires_in`으로 만료 시각을 계산한다. 응답에 `refresh_token`이 없으면 기존 값을 유지한다.
- 동시 요청 중복 갱신은 인스턴스 안에서는 진행 중인 Promise 하나를 공유해서 막고, 인스턴스 사이에서는 행 잠금으로 막는다.

### `src/lib/smartthings.ts` 변경

- `stFetch`와 `fetchCameraMedia`가 `process.env.SMARTTHINGS_TOKEN` 대신 `await getAccessToken()`을 쓴다.
- SmartThings API의 401은 기존처럼 `status: 401` 오류로 올라가므로, 화면에서는 "연결 필요"와 같게 처리된다.
- `clearCaches()`를 export한다. 연결 직후에는 30초 실패 캐시(`deviceCache`, `statusCache`)를 비운다.
- "개인 토큰으로는 재생할 수 없어서" 주석을 현실에 맞게 고친다.

### OAuth 라우트

- `GET /api/smartthings/oauth/start`: proxy가 세션을 확인한다.
  - 랜덤 `state`를 httpOnly·SameSite=Lax 쿠키(10분)에 저장한다.
  - `https://api.smartthings.com/oauth/authorize?client_id&response_type=code&redirect_uri&scope`로 리다이렉트한다.
- `GET /api/smartthings/oauth/callback`
  - 쿼리 `state`가 쿠키와 같은지 확인한다. 다르면 400.
  - `exchangeCode` → `clearCaches()` → state 쿠키 삭제 → `/devices/smartthings`로 리다이렉트한다.
  - `error` 쿼리(사용자가 거부한 경우)나 교환 실패 시에는 `/devices/smartthings?st_error=1`로 보낸다.
  - 세션 쿠키가 SameSite=Lax라서 top-level GET 리다이렉트에도 쿠키가 실려 proxy를 통과한다.
- `redirect_uri`는 env `SMARTTHINGS_REDIRECT_URI`로 명시한다. 앱이 Traefik(http 엔트리포인트) 뒤에 있어서 요청 origin이 `http://`로 보일 수 있기 때문이다. SmartThings에 등록한 값과 같아야 한다.
- 콜백 이후 리다이렉트는 상대 경로 `Location`(303)으로 보낸다(같은 이유).

### go2rtc 토큰 엔드포인트: `GET /api/smartthings/token`

- `proxy.ts`는 이 경로만 세션 검사를 건너뛴다.
- route는 `Authorization: Bearer <SMARTTHINGS_TOKEN_SECRET>`을 `timingSafeEqual`로 비교한다. env가 비었거나 32자 미만이거나 값이 다르면 401.
- 통과하면 `getAccessToken()` 값을 `text/plain`으로 돌려준다(`Cache-Control: no-store`). 연결 안 됨은 401이 아니라 503으로 돌려서 비밀키 오류와 구분한다.

### go2rtc 변경 (사용자 적용)

- env: `SMARTTHINGS_TOKEN` → `SMARTTHINGS_TOKEN_SECRET`, `APP_HOST` 전달
- 스크립트 `set -eu` 다음 줄:
  ```sh
  SMARTTHINGS_TOKEN=$$(curl -sf -H "Authorization: Bearer $$SMARTTHINGS_TOKEN_SECRET" "https://$$APP_HOST/api/smartthings/token")
  ```
  나머지는 그대로 둔다. 스트림이 끊겨 스크립트가 다시 실행되면 새 토큰을 받는다.

### UI

- `SmartThingsConnect` 컴포넌트: 안내 문구와 `/api/smartthings/oauth/start` 링크 버튼.
- SmartThings 목록 페이지: `status === 401` 오류면 오류 문구 대신 `SmartThingsConnect`를 보여준다. `st_error=1`이면 "연결에 실패했습니다" 문구를 함께 보여준다.
- 카메라 상세 페이지: `getDevice`가 401이면 `SmartThingsConnect`를 보여준다.
- 메인 대시보드 카드: 401이면 "SmartThings 연결이 필요합니다."라고 표시한다(기존 오류 문구 분기에 추가).

### env / 배포 파일

- `.env.example`, `docker-compose.yml`: `SMARTTHINGS_TOKEN`을 빼고 `SMARTTHINGS_CLIENT_ID`, `SMARTTHINGS_CLIENT_SECRET`, `SMARTTHINGS_REDIRECT_URI`, `SMARTTHINGS_TOKEN_SECRET`을 추가한다.

## 오류 처리 요약

| 상황 | 결과 |
|---|---|
| 토큰 행 없음 | 401 → 연결 버튼 |
| refresh 실패(30일 만료·해제) | 401 → 연결 버튼 |
| API 401(토큰 무효) | 401 → 연결 버튼 |
| 콜백 state 불일치 | 400 |
| 콜백 거부·교환 실패 | 목록으로 돌아가 실패 문구 + 연결 버튼 |
| go2rtc 비밀키 불일치 | 401 |
| go2rtc 요청인데 앱이 미연결 | 503 |

## 검증

- `needsRefresh` / `toTokenRow`의 assert 기반 셀프 체크 스크립트 1개
- 수동:
  1. 연결 → SmartThings 목록 표시
  2. DB `expires_at`을 과거로 바꾼 뒤 새로고침 → 갱신되고 `updated_at`이 바뀌는지 확인
  3. `curl /api/smartthings/token`: 비밀키 없으면 401, 있으면 토큰
  4. go2rtc 스크립트 변경 후 실시간 영상 재생
- `tsc --noEmit`, `npm run lint`, `npm run build` 통과
