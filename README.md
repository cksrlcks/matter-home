# Matter Home

Raspberry Pi에 구축된 Matter/Thread 인프라(`matterjs-server`)를 이용해
웹에서 IKEA Matter 기기를 관리하는 Next.js 서비스입니다.

```
브라우저 → Next.js (UI/API) → matterjs-server (WebSocket :5580) → OTBR → Thread → Matter 기기
```

Next.js는 Matter 프로토콜을 직접 구현하지 않고, `@matter-server/ws-client`로
matterjs-server의 WebSocket API를 호출하는 **UI/API 계층**만 담당합니다.

## 현재 구현 범위 (Phase 1)

- ✅ matterjs-server WebSocket 연결 (server-only 싱글턴)
- ✅ `GET /api/devices` — commissioning 된 node 목록 조회 (DTO로 normalize)
- ✅ 기기 카드 UI (이름 / 벤더 / Online 상태 / ON·OFF)
- ✅ `POST /api/devices/:nodeId/power` — OnOff cluster(6) 제어
- ✅ React Query 기반 조회 + optimistic mutation + 3초 polling
- ✅ loading / error UI
- ✅ 임시 로그인(env 계정) + 세션 쿠키 + proxy 보호
- ✅ 기기 이름 관리 (Postgres + Drizzle) — 카드에서 인라인 편집, 기본 이름으로 초기화

아직 구현하지 않은 것: 회원가입/실제 인증, commissioning UI, 센서 시각화,
실시간 WebSocket push, 자동화/스케줄 (명세 19장 참고).

## 기술 스택

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 ·
TanStack React Query · react-hook-form + zod · sonner ·
`@matter-server/ws-client` + `ws` · Drizzle ORM + Postgres(`postgres`)

> Next.js 16에서 `middleware`는 `proxy`로 이름이 바뀌었고 Node.js 런타임에서 동작합니다.
> 인증 진입 검사는 [`src/proxy.ts`](src/proxy.ts)에 있습니다.

## 환경변수

| 변수 | 설명 | 예시 |
| --- | --- | --- |
| `MATTER_SERVER_URL` | matterjs-server WebSocket 주소 (server-only) | `ws://192.168.0.100:5580/ws` |
| `AUTH_USERNAME` | 임시 로그인 아이디 | `admin` |
| `AUTH_PASSWORD` | 임시 로그인 비밀번호 (비면 로그인 비활성화) | — |
| `AUTH_SECRET` | 세션 쿠키 HMAC 서명 키 (`openssl rand -hex 32`) | — |
| `DATABASE_URL` | Postgres. 기기 이름 저장에 사용 (없으면 이름 변경만 비활성, 목록/제어는 정상) | dev/prod 아래 참고 |

- 실제 비밀값은 **git에 커밋하지 않습니다.** 로컬은 `.env.local`, 배포는 Dokploy Environment.
- 키 목록은 [`.env.example`](.env.example) 참고.
- `NEXT_PUBLIC_` 접두사를 붙이지 마세요. Matter Server 주소를 브라우저에 노출하면 안 됩니다.

`DATABASE_URL` 환경별 값:

```
dev(개발 PC):   postgresql://matter:<password>@192.168.0.100:5433/matter
prod(dokploy):  postgresql://matter:<password>@matter-db:5432/matter
```

## 로컬 개발

```bash
npm install
cp .env.example .env.local   # 값 채우기 (AUTH_PASSWORD, AUTH_SECRET 등)
npm run dev
```

`http://localhost:3000` → 로그인 → 기기 목록. matterjs-server(`192.168.0.100:5580`)에
접근 가능한 네트워크여야 합니다.

## 데이터베이스 / 마이그레이션 (Drizzle)

기기 이름은 `device_names` 테이블에 저장합니다. 스키마는
[`src/lib/db/schema.ts`](src/lib/db/schema.ts).

```bash
npm run db:generate   # 스키마 변경 → drizzle/ 에 SQL 마이그레이션 생성 (DB 불필요)
npm run db:migrate    # 마이그레이션 수동 적용 (.env.local의 DATABASE_URL 사용)
npm run db:studio     # Drizzle Studio
```

- **자동 마이그레이션**: 서버가 뜰 때 [`src/instrumentation.ts`](src/instrumentation.ts)가
  `drizzle/`의 SQL을 적용합니다. 따라서 `npm run dev`나 배포 컨테이너 기동만으로
  테이블이 준비됩니다(별도 수동 적용 불필요). DB가 잠깐 죽어 있어도 앱은 뜨고,
  기기 목록/제어는 계속 동작하며 이름 기능만 일시 비활성화됩니다.
- 스키마를 바꿨다면 반드시 `npm run db:generate`로 SQL을 생성해 **커밋**하세요.
  (이미지에 `drizzle/`가 포함되어 기동 시 적용됩니다.)

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── auth/{login,logout}/route.ts   # 임시 로그인/로그아웃
│   │   └── devices/
│   │       ├── route.ts                   # GET 목록
│   │       └── [nodeId]/
│   │           ├── route.ts               # PATCH(이름변경) / DELETE(초기화)
│   │           └── power/route.ts         # POST ON/OFF
│   ├── login/page.tsx
│   ├── page.tsx                           # 대시보드
│   ├── layout.tsx · providers.tsx · globals.css
├── components/                            # device-card / device-list / power-switch / device-name / login-form ...
├── hooks/use-devices.ts                   # React Query 훅 (목록/전원/이름)
├── lib/
│   ├── matter/{client,devices,device-types}.ts   # server-only Matter 계층
│   ├── db/{index,schema,device-names,migrate}.ts # server-only Drizzle 계층
│   └── auth/{config,token,session}.ts            # 세션/인증
├── types/matter.ts                        # 공용 DTO
├── instrumentation.ts                     # 서버 기동 시 DB 자동 마이그레이션
└── proxy.ts                               # 인증 진입 검사 (구 middleware)

drizzle/                                   # 생성된 마이그레이션 SQL (커밋 + 이미지에 포함)
drizzle.config.ts
```

## 배포 (Dokploy + Docker)

이 저장소는 [`Dockerfile`](Dockerfile)(Next.js standalone)과
[`docker-compose.yml`](docker-compose.yml)을 포함합니다.

1. GitHub(private)에 push
2. Dokploy에서 Compose 애플리케이션 생성 → 이 저장소 연결 (`build: .`)
3. **Environment** 탭에 비밀값 주입 (compose에는 값을 적지 않고 `${...}`로 참조):
   ```
   AUTH_USERNAME=admin
   AUTH_PASSWORD=<비밀번호>
   AUTH_SECRET=<openssl rand -hex 32>
   DATABASE_URL=postgresql://matter:<password>@matter-db:5432/matter
   ```
4. 도메인 `matter.heavybear-lab.net` 연결 (`*.heavybear-lab.net` wildcard route가
   이미 `dokploy-traefik:80`으로 걸려 있으므로 Cloudflare route 추가 불필요)

### 네트워킹 주의점

- **DB**: 앱과 `matter-db`는 `matter-network`(external)로 묶여 있어
  `matter-db:5432`로 접근합니다.
- **Matter Server**: `matterjs-server`는 컨테이너가 아니라 라즈베리파이 **호스트**의
  `192.168.0.100:5580`에서 동작합니다. 컨테이너에서 이 주소에 닿는지 먼저 확인하세요.
  ```bash
  docker compose exec app node -e "require('ws')" # (예시) 또는 curl http://192.168.0.100:5580
  ```
  닿지 않으면 `host.docker.internal` 또는 실제 호스트 IP로 `MATTER_SERVER_URL`을 조정합니다.
- **Traefik 라우팅**: Dokploy가 도메인을 이 서비스(포트 3000)로 라우팅하려면
  프록시 네트워크 연결이 필요할 수 있습니다. Dokploy에서 도메인을 연결하면 보통
  자동 처리되지만, 라우팅이 안 되면 서비스를 Dokploy의 proxy network에도 붙이세요.
- 컨테이너는 `0.0.0.0:3000`에서 listen 합니다 (`HOSTNAME`/`PORT`는 Dockerfile에 설정).

## 인증 관련 메모 (임시)

- 현재는 env 계정(`AUTH_USERNAME`/`AUTH_PASSWORD`) 기반의 단일 로그인입니다.
  자격증명은 **소스/커밋 파일에 남기지 않고** env로만 주입합니다.
- 세션은 HttpOnly 쿠키(`mh_session`, HMAC 서명)로 관리하며 7일 만료입니다.
- `proxy.ts`는 첫 방어선이며, 각 API route와 `lib/matter` 계층에서도 세션을 재검증합니다.
- 외부 공개 전, 명세 15장에 따라 실제 인증(Better Auth / Cloudflare Access 등)으로 교체하세요.

## Matter 연동 메모

- attribute는 `"<endpoint>/<cluster>/<attribute>"` key로 저장됩니다.
  OnOff 상태 = `"1/6/0"`, 벤더명 = `"0/40/1"`.
- ON/OFF 제어는 `deviceCommand(nodeId, endpoint, 6, "on" | "off")`를 사용합니다.
  만약 물리 동작이 안 되면 command 이름만 설치된 `@matter-server/ws-client` 타입에 맞춰
  [`src/lib/matter/devices.ts`](src/lib/matter/devices.ts)에서 조정하세요.
- Matter Server raw 구조는 UI로 직접 넘기지 않고 `lib/matter`에서 DTO로 변환합니다.
```
