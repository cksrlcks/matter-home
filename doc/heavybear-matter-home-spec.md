# Heavybear Matter Home — Next.js 구현 명세

## 1. 프로젝트 목표

Raspberry Pi에 구축된 Matter/Thread 인프라를 이용해 웹에서 IKEA Matter 기기를 관리하는 서비스를 만든다.

최종 사용자 흐름:

```text
외부 사용자
   ↓
https://matter.heavybear-lab.net
   ↓
Cloudflare Tunnel
   ↓
Next.js
   ↓
Node.js Server API
   ↓ WebSocket
matterjs-server :5580
   ↓
OTBR
   ↓
nRF52840 RCP
   ↓ Thread
IKEA Matter Device
```

현재 인프라 상태:

- Raspberry Pi 사용
- Dokploy 설치 완료
- Cloudflare Tunnel 연결 완료
- `*.heavybear-lab.net` wildcard route 구성 완료
- OTBR 실행 완료
- nRF52840을 OpenThread RCP로 사용 중
- Thread Network 생성 완료
  - Network Name: `home-thread`
  - Ethernet interface: `eth0`
- Matter Server 실행 완료
  - Web UI: `http://192.168.0.100:5580`
- IKEA `GRILLPLATS Plug` commissioning 완료
- Matter Server Web UI에서 기기 인식 확인
- Endpoint 1이 `On Off Plug In Unit`
- 실제 ON/OFF 제어 성공 확인

즉, Next.js는 Matter 프로토콜을 직접 구현하지 않고
`matterjs-server`의 WebSocket API를 이용해 UI/API 계층을 제공한다.

---

# 2. 기술 스택

## Frontend / Backend

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui 사용 가능
- Server Route Handler 기반 API

## Matter 연동

```bash
npm install @matter-server/ws-client ws
```

역할:

```text
@matter-server/ws-client
→ matterjs-server WebSocket API Client

ws
→ Node.js WebSocket 구현
```

Matter WebSocket 주소:

```env
MATTER_SERVER_URL=ws://192.168.0.100:5580/ws
```

주의:

- 이 환경변수는 서버에서만 사용한다.
- `NEXT_PUBLIC_` prefix를 붙이지 않는다.
- 브라우저에서 Matter Server에 직접 연결하지 않는다.

---

# 3. 프로젝트 생성

```bash
npx create-next-app@latest matter-home
```

권장 설정:

```text
TypeScript        Yes
ESLint            Yes
Tailwind CSS      Yes
src directory     Yes
App Router        Yes
Turbopack         Yes
```

설치 후:

```bash
cd matter-home

npm install @matter-server/ws-client ws
```

---

# 4. 기본 프로젝트 구조

```text
src/
├── app/
│   ├── api/
│   │   ├── devices/
│   │   │   ├── route.ts
│   │   │   └── [nodeId]/
│   │   │       ├── route.ts
│   │   │       └── power/
│   │   │           └── route.ts
│   │   │
│   │   └── commission/
│   │       └── route.ts
│   │
│   ├── devices/
│   │   └── page.tsx
│   │
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── device-card.tsx
│   ├── device-list.tsx
│   ├── commission-dialog.tsx
│   └── power-switch.tsx
│
├── lib/
│   ├── matter/
│   │   ├── client.ts
│   │   ├── devices.ts
│   │   ├── commands.ts
│   │   └── types.ts
│   └── utils.ts
│
└── types/
    └── matter.ts
```

---

# 5. 환경변수

`.env.local`

```env
MATTER_SERVER_URL=ws://192.168.0.100:5580/ws
```

나중에 Raspberry Pi/Dokploy 내부에서 Next.js를 실행할 경우
Matter Server 접근 주소는 배포 환경에 맞게 수정할 수 있다.

현재 Matter Server와 Next.js 서버가 같은 Raspberry Pi에서 host networking을 사용한다면
아래 주소도 검토할 수 있다.

```env
MATTER_SERVER_URL=ws://127.0.0.1:5580/ws
```

단, Next.js가 일반 Docker bridge network에서 실행되는 경우
`127.0.0.1`은 Next.js 컨테이너 자신을 가리키므로 사용할 수 없다.

배포 환경에 따라 다음 중 하나를 사용한다.

```text
ws://192.168.0.100:5580/ws
ws://host.docker.internal:5580/ws
기타 실제 host 접근 주소
```

초기 개발에서는:

```env
MATTER_SERVER_URL=ws://192.168.0.100:5580/ws
```

사용.

---

# 6. Matter Client 모듈

파일:

```text
src/lib/matter/client.ts
```

목표:

- Matter Server WebSocket 연결을 한 곳에서 관리
- 요청마다 WebSocket connection을 무한 생성하지 않도록 구성
- 서버 전용 코드로 작성
- 브라우저 bundle에 포함되지 않게 할 것

구조 예시:

```ts
import "server-only";

import { MatterClient } from "@matter-server/ws-client";
import WebSocket from "ws";

const matterServerUrl = process.env.MATTER_SERVER_URL;

if (!matterServerUrl) {
  throw new Error("MATTER_SERVER_URL is not defined");
}

let client: MatterClient | null = null;
let initialized = false;

export async function getMatterClient() {
  if (!client) {
    client = new MatterClient(
      matterServerUrl,
      (url) => new WebSocket(url) as never,
    );
  }

  if (!initialized) {
    await client.startListening();
    initialized = true;
  }

  return client;
}
```

주의:

실제 설치된 `@matter-server/ws-client` 버전에 따라
constructor / 메서드 signature가 다를 수 있다.

AI 구현 시 반드시 현재 설치된 package type definition을 확인하고
실제 API에 맞춰 수정할 것.

추측으로 API를 만들지 않는다.

---

# 7. 1차 구현 목표

처음부터 commissioning까지 전부 구현하지 않는다.

우선 현재 등록되어 있는 GRILLPLATS를 이용해 다음 단계부터 구현한다.

```text
Phase 1
기기 목록 조회

Phase 2
기기 상태 표시

Phase 3
ON/OFF 제어

Phase 4
상태 자동 갱신

Phase 5
새 Matter 기기 Commission

Phase 6
기기 제거 / 관리
```

---

# 8. 기기 목록 API

Endpoint:

```text
GET /api/devices
```

Matter Server에서 현재 commissioning 된 node 목록을 가져온다.

응답은 Matter Server raw response를 그대로 frontend에 노출하지 말고
우리 서비스용 DTO로 변환한다.

예:

```ts
type DeviceDto = {
  nodeId: string;
  name: string;
  vendorName?: string;
  productName?: string;
  online: boolean;
  endpoints: {
    id: number;
    deviceType?: string;
  }[];
};
```

예상 응답:

```json
[
  {
    "nodeId": "1",
    "name": "GRILLPLATS Plug",
    "vendorName": "IKEA of Sweden",
    "productName": "GRILLPLATS Plug",
    "online": true,
    "endpoints": [
      {
        "id": 1,
        "deviceType": "On Off Plug In Unit"
      },
      {
        "id": 2,
        "deviceType": "Electrical Sensor"
      }
    ]
  }
]
```

중요:

Matter Server Web UI에서 확인된 GRILLPLATS의 제어 endpoint는 현재:

```text
Endpoint 1
On Off Plug In Unit
```

이다.

---

# 9. ON/OFF API

Endpoint:

```text
POST /api/devices/:nodeId/power
```

Request:

```json
{
  "state": true
}
```

또는:

```json
{
  "state": false
}
```

Matter OnOff cluster:

```text
Cluster ID: 6
Endpoint: 1
```

개념적인 호출:

```ts
await client.deviceCommand(
  nodeId,
  1,
  6,
  state ? "on" : "off",
);
```

실제 함수 signature는 설치된 `@matter-server/ws-client` 타입을 확인해서 맞춘다.

응답:

```json
{
  "success": true,
  "state": true
}
```

에러 시:

```json
{
  "success": false,
  "message": "Failed to control device"
}
```

HTTP status도 적절히 반환한다.

---

# 10. 홈 화면 UI

초기 화면은 복잡하게 만들지 않는다.

예:

```text
Heavybear Home

────────────────────────

GRILLPLATS Plug
IKEA of Sweden

● Online

Power
[       ON       ]

────────────────────────

+ Matter 기기 추가
```

Device Card에는 우선:

- Product name
- Vendor
- Online / Offline
- ON/OFF 상태
- Toggle
- Node ID는 개발 모드에서만 표시 가능

UI는 모바일/PC 반응형으로 구성한다.

---

# 11. 상태 관리

초기 버전은 React Query 사용 권장.

예:

```text
GET /api/devices
```

를 Query로 관리한다.

ON/OFF mutation 후:

- optimistic update 가능
- 실패 시 rollback
- 성공 후 invalidateQueries

예:

```ts
useQuery({
  queryKey: ["matter", "devices"],
  queryFn: getDevices,
});
```

```ts
useMutation({
  mutationFn: updatePower,
});
```

초기 버전에서는 polling도 가능하다.

예:

```ts
refetchInterval: 3000
```

향후에는 Matter Server WebSocket event를 Next.js가 받아
SSE 또는 WebSocket으로 frontend에 전달하는 구조로 개선 가능하다.

---

# 12. Commission UI

1차 ON/OFF 기능 구현 후 추가한다.

사용자 화면:

```text
새 Matter 기기 추가

1. 기기를 페어링 모드로 만들어주세요.

Matter Code
[ 0262-351-6467 ]

[ 기기 연결 ]
```

입력값은 normalize 한다.

```ts
"0262-351-6467"
↓
"02623516467"
```

Commission API:

```text
POST /api/commission
```

Request:

```json
{
  "code": "02623516467"
}
```

서버에서는 Matter Server의 commissioning API를 호출한다.

개념:

```ts
await client.commissionWithCode(code, ...);
```

실제 signature는 package type definition을 기준으로 구현한다.

---

# 13. Thread Dataset 처리

현재 Matter Server에는 이미 다음 Thread network credential이 등록되어 있다.

```text
Network Name: home-thread
Channel: 15
```

Matter Server 로그에서도 다음이 확인됨:

```text
Registered Thread credentials from stored:default
network="home-thread"
ch=15
```

따라서 일반 사용자에게 commissioning 시
Thread Operational Dataset HEX를 매번 입력하게 하지 않는다.

Thread credential은 서버 인프라 설정으로 취급한다.

필요 시 관리자 Settings 페이지에서만 관리한다.

절대 frontend public environment variable에 저장하지 않는다.

---

# 14. 보안

외부 공개 대상:

```text
https://matter.heavybear-lab.net
```

외부 공개 금지:

```text
OTBR Web UI :8082
OTBR REST   :8081
Matter Server :5580
Dokploy raw port :3000
```

인터넷에서는 Next.js만 접근하게 한다.

구조:

```text
Internet
   ↓
Cloudflare
   ↓
Cloudflare Tunnel
   ↓
matter.heavybear-lab.net
   ↓
Next.js
   ↓ internal
Matter Server
   ↓
OTBR
```

Matter Server WebSocket을 브라우저에 직접 노출하지 않는다.

---

# 15. 인증

초기 개발 단계에서는 생략 가능.

외부 공개 전에 반드시 인증을 추가한다.

선택지:

- Better Auth
- Auth.js
- 자체 로그인
- Cloudflare Access

개인 홈 IoT 서비스이므로
Cloudflare Access를 앞단에 두는 것도 좋은 선택이다.

최소한 인증 없는 상태로
Matter commissioning / ON-OFF API를 인터넷에 공개하지 않는다.

---

# 16. Dokploy 배포

Next.js 앱을 Dokploy에 배포한다.

도메인:

```text
matter.heavybear-lab.net
```

Cloudflare Tunnel에는 이미:

```text
*.heavybear-lab.net
→ dokploy-traefik:80
```

wildcard route가 있으므로 Cloudflare에 route를 추가할 필요 없다.

Dokploy Application에서 도메인만:

```text
matter.heavybear-lab.net
```

연결한다.

Cloudflare Tunnel을 통해 HTTPS를 처리한다.

---

# 17. Dockerfile

Next.js standalone output 사용 권장.

`next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

Dockerfile 예시:

```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

---

# 18. Matter Server 연결 시 주의점

Matter Server는 Raspberry Pi에서:

```text
http://192.168.0.100:5580
ws://192.168.0.100:5580/ws
```

로 동작 중이다.

Next.js가 로컬 PC에서 실행될 때:

```env
MATTER_SERVER_URL=ws://192.168.0.100:5580/ws
```

사용.

Dokploy Docker 안에서 실행할 때는
컨테이너에서 `192.168.0.100:5580` 접근이 가능한지 먼저 확인한다.

예:

```bash
curl http://192.168.0.100:5580
```

또는 WebSocket 연결 테스트.

접근이 안 되면 Docker networking을 조정한다.

Matter Server 자체는 외부에 공개하지 않는다.

---

# 19. 첫 번째 구현 완료 조건

AI는 우선 여기까지만 완성한다.

## Must Have

- Next.js App Router 프로젝트
- Matter Server WebSocket client
- `/api/devices`
- 등록된 GRILLPLATS 표시
- Online 상태 표시
- GRILLPLATS ON 버튼
- GRILLPLATS OFF 버튼
- 실제 물리 콘센트 ON/OFF 성공
- loading/error UI
- TypeScript strict 기준 오류 없음
- Matter Server raw API 구조를 UI에 직접 노출하지 않음

## 아직 하지 않아도 되는 것

- 회원가입
- Matter 기기 commissioning
- Multi Admin
- SmartThings 연동
- OTA
- Electrical Sensor 시각화
- 실시간 WebSocket push
- 자동화
- 스케줄링

---

# 20. 두 번째 구현 단계

ON/OFF가 안정적으로 작동한 뒤 다음을 구현한다.

```text
+ Matter Device
```

기능:

- Manual Pairing Code 입력
- Matter QR payload 입력 가능
- Commission 시작
- 진행 상태 표시
- 완료 후 device list 자동 갱신
- 실패 시 reason 표시

화면 예:

```text
Add Matter Device

기기를 Pairing Mode로 만들어주세요.

Matter Code
┌─────────────────────┐
│ 0262-351-6467       │
└─────────────────────┘

[ Connect ]

Connecting via Bluetooth...
Joining home-thread...
Commissioning...
Complete
```

Commission은 Raspberry Pi Bluetooth를 통해 이루어진다.

사용자가 외부에서 웹사이트를 열어도
BLE 통신은 사용자 PC/휴대폰이 아니라 Raspberry Pi에서 수행한다.

따라서 Matter 기기는 Raspberry Pi의 Bluetooth 범위 안에 있어야 한다.

---

# 21. 향후 기능

추후 다음 기능을 확장할 수 있다.

## Device

- rename
- room grouping
- remove
- reconnect status
- vendor/product detail
- firmware version

## Control

- plug ON/OFF
- light brightness
- color temperature
- RGB
- sensor values

## Automation

예:

```text
18:00 → Plug ON
23:00 → Plug OFF
```

또는:

```text
외출 모드 → 전체 OFF
```

## Monitoring

GRILLPLATS Endpoint 2의 Electrical Sensor를 활용해
지원되는 경우 다음 값을 UI에 표시할 수 있다.

- Voltage
- Current
- Active Power
- Energy

실제 expose 되는 Matter cluster를 확인한 뒤 구현한다.

---

# 22. AI 구현 지침

다음 원칙을 반드시 지킨다.

1. Matter protocol을 Next.js에서 직접 구현하지 않는다.
2. 기존 `matterjs-server`를 Controller backend로 사용한다.
3. `@matter-server/ws-client`의 실제 설치 버전 타입 정의를 먼저 확인한다.
4. 존재하지 않는 method/signature를 추측해서 사용하지 않는다.
5. Matter Server와 통신하는 코드는 Server-only로 둔다.
6. Matter Server URL을 브라우저에 노출하지 않는다.
7. Thread Dataset / Network Key를 Client에 전달하지 않는다.
8. API Route에서 Matter Server error를 적절한 HTTP error로 변환한다.
9. Matter Node의 복잡한 raw structure를 UI component에서 직접 해석하지 않는다.
10. `lib/matter` 계층에서 서비스용 DTO로 normalize 한다.
11. 첫 목표는 GRILLPLATS ON/OFF 성공이다.
12. commissioning UI는 ON/OFF 기능이 안정화된 이후 구현한다.
13. Matter Server / OTBR 설정을 Next.js 코드가 임의로 변경하지 않는다.
14. 외부 공개 전 인증을 추가한다.

---

# 23. 현재 테스트 장치

현재 Matter Server에 다음 장치가 commissioning 되어 있다.

```text
Vendor:
IKEA of Sweden

Product:
GRILLPLATS Plug

Matter:
Matter over Thread

Thread Network:
home-thread

Controllable Endpoint:
1

Device Type:
On Off Plug In Unit
```

Matter Server Web UI에서는 commissioning 및 node 정보 확인 완료.

실제 물리 ON/OFF 동작도 확인 완료.

따라서 Next.js 개발 단계에서는
새 기기를 추가하지 말고 기존 GRILLPLATS를 대상으로 먼저 개발한다.

---

# 24. 개발 시작 Prompt

AI Coding Agent에 아래처럼 전달하면 된다.

```text
이 저장소에 위 명세를 기준으로 Matter Home 서비스를 구현해줘.

우선 Phase 1만 구현한다.

목표:
1. matterjs-server WebSocket API 연결
2. 현재 commissioning 되어 있는 Matter node 목록 조회
3. IKEA GRILLPLATS Plug를 화면에 표시
4. Endpoint 1의 OnOff cluster를 사용해 실제 ON/OFF 제어
5. React Query 기반 조회/Mutation
6. loading/error/optimistic UI 처리

중요:
- @matter-server/ws-client의 실제 설치 버전 타입 정의와 API를 먼저 확인할 것.
- 존재하지 않는 메서드를 추측해서 작성하지 말 것.
- Matter Server 접근 코드는 server-only로 구현할 것.
- Matter Server URL은 MATTER_SERVER_URL 환경변수로 받을 것.
- Matter Server raw node 데이터를 frontend에 그대로 전달하지 말고 DTO로 normalize할 것.
- commissioning UI는 아직 구현하지 말 것.
```
