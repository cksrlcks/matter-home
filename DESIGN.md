---
scope: user
generated: 2026-10-11
summary: 개인 홈 컨트롤(Matter/SmartThings) 앱. "스티커 타일" — 크림 배경 위에 잉크 외곽선과 딱 떨어지는 그림자가 붙은 원색 타일. 캐주얼하고 장난스럽게, 폰에서 한 손으로.
---

# 디자인 시스템 — 스티커 타일

레퍼런스(Mobbin): Abode(굵은 색면 타일 + 캐릭터 일러스트), Google Home(타일 전체 탭, 하단 탭, 홈의 편집 진입), Amazon Alexa(큰 On/Off), Klarna·Rocket Money(별도 편집 모드에서 끌어서 순서 변경), Apple Fitness(편집 중 흔들리는 타일 + 빼기 배지).

> `design/*.html`, `design/APPLY.md`는 이전 가이드(오프화이트 + 네이비) 기준이라 지금 화면과 맞지 않는다.

## 원칙

- **색이 곧 상태.** 켜진 타일만 종류별 원색, 꺼지면 색이 빠지고(베이지) 그림은 흑백으로 흐려진다. 오프라인은 점선 + 그림자 없음.
- **스티커.** 타일·카드·버튼·인풋은 2px 잉크 외곽선 + 흐림 없는 그림자(`sticker`). 누르면 그림자 쪽으로 눌린다(`sticker-press`).
- **타일 전체가 버튼.** 홈에서는 작은 전원 버튼을 두지 않는다. 탭 = 켜고 끄기, 길게 누르기/⋯ = 상세 시트.
- **평소 화면과 편집을 분리.** 순서·그룹 이동·숨기기는 홈의 편집 모드에서만. 편집 중에는 타일을 눌러도 켜지지 않는다.
- **엄지 영역.** 주 메뉴는 하단에 떠 있는 알약 탭, 다이얼로그는 폰에서 아래에서 올라오는 시트.

안티 패턴: 흐린 그림자·그라데이션·글래스모피즘, 타일 위 회색 글자(타일 글자는 항상 잉크), 홈 타일에 작은 보조 버튼 늘리기.

## 토큰 (`src/app/globals.css`)

| 유틸 | light | dark | 용도 |
|---|---|---|---|
| `bg-background` | `#FFF4DC` | `#1F1B14` | 페이지 |
| `bg-card` | `#FFFDF6` | `#2B261D` | 카드·인풋·시트 |
| `bg-muted` | `#F4E7C6` | `#383123` | 패널, 꺼진 타일 |
| `text-muted-foreground` | `#6B6250` | `#BDB198` | 보조 설명 |
| `border-border` | `#E3D3A8` | `#4D4433` | 얇은 구분선 |
| `border-ink` / 그림자 | `#1B1B1B` | `#000000` | 스티커 외곽선·그림자 |
| `bg-primary` | `#1B1B1B` | `#FFF4DC` | 주요 버튼, 하단 탭 바탕 |
| `bg-accent-soft` | `#FFE58A` | `#4E4213` | 선택됨, 기기 탭의 켜진 카드 |

타일 색(라이트/다크 공통, 글자는 `text-tile-ink` `#1B1B1B`):

| 종류 | 유틸 | 값 |
|---|---|---|
| 조명 | `bg-tile-light` | `#FFD23F` |
| 플러그 | `bg-tile-plug` | `#FF8FB1` |
| 스위치 | `bg-tile-switch` | `#8EC5FF` |
| 카메라 | `bg-tile-camera` | `#B7E36B` |
| TV | `bg-tile-tv` | `#C5A8FF` |
| 기타 | `bg-tile-other` | `#FFB067` |

- 종류는 `lib/device-kind.ts`의 `kindFromHint`가 이름·기기 유형에서 짐작한다.
- 그림자: `shadow-sm` 2px, `shadow-md` 3px, `shadow-lg` 5px (모두 흐림 0, 잉크색).
- 라운드: 타일·카드·시트 `rounded-3xl`, 버튼·인풋 `rounded-xl`, 칩·탭 `rounded-full`.

## 서체

- 제목(`h1`~`h3`)과 타일 이름: **Jua**(`font-display`). 단일 굵기라 `font-bold`를 붙이지 않는다.
- 본문·수치·버튼: Pretendard. 수치는 `tabular-nums`.

## 그림

- `components/device-art.tsx`의 `DeviceArt`가 종류별 스티커 그림을 그린다.
- 그림은 `public/art/`의 256px 투명 PNG(평면 스티커: 굵은 검은 외곽선 + 흰 테두리 + 점 눈과 작은 미소). `ART_IMAGES`에 등록하고, 등록되지 않은 종류는 SVG로 대신한다. 장면 그림(로그인·빈 홈)은 `SceneArt`.
- 새 그림은 `light.png`를 기준 그림으로 삼아 같은 문장 틀로 생성해 그림체를 맞춘다.
- 켜짐/꺼짐은 그림을 두 장 두지 않고 꺼짐일 때 `grayscale` + 투명도로 처리한다.

## 화면

- **홈**: 큰 제목 + "N개 켜져 있어요", 전력 요약 카드, 그룹별 타일 격자(폰 2열, `sm` 이상 3열). 묶어서 보는 다구 기기는 가로 두 칸.
- **기기**: 등록된 기기 카드(이름 변경·제거·홈 표시). Matter / SmartThings 2차 탭.
- **설정**: 그룹(추가·이름·순서·삭제), Wi-Fi, SmartThings 연결, 로그아웃.
