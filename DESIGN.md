---
scope: user
generated: 2026-09-29
summary: 개인 홈 컨트롤(Matter/SmartThings) 앱. 선명·경쾌한 톤 — 오프화이트 베이스 위에 잉크 뉴트럴 + 짙은 네이비 포인트 1색. 색은 "상태"만 말하고(켜짐 = 네이비 틴트), 수치는 크게 라벨은 작게.
---

# 디자인 시스템 (user)

레퍼런스: Google Home(상태 틴트 타일·즐겨찾기 그리드), SmartThings(타일 코너 전원 버튼), Amazon Alexa(방 칩 + 기기 행), Philips Hue(카드 안 밝기 슬라이더), Tesla(라이브 카메라 뷰 + 하단 액션 2개). COVA 패턴에서는 "핵심 지표 대형 숫자 나열", "pill 카테고리 탭"의 리듬만 참고.

채택한 트렌드 무브(균형: 2개)
- **⑯ 오프화이트 베이스** — 페이지 `#F4F5F2`, 카드 순백. 그림자 대신 배경 톤 차이로 구분.
- **⑪ 극단적 위계 대비** — 11px 대문자 eyebrow 라벨 + 44px 수치. 크기 단계 4개로 압축.

안티 패턴(금지): 보라-파랑 그라데이션, 글래스모피즘, 글로우 버튼, 네이비를 버튼 배경으로 사용(primary는 잉크 유지).

## 디자인 토큰

### 색

| 역할 | 변수 | 값 (light) | 값 (dark) | 용도 |
|---|---|---|---|---|
| primary | `--color-primary` | `#202327` | `#F2F3F0` | 주요 버튼, 활성 칩/탭, 전원 on 버튼 채움 |
| primary-strong | `--color-primary-strong` | `#0D0F11` | `#FFFFFF` | primary hover |
| secondary (네이비 포인트) | `--color-secondary` | `#1B2F5E` | `#7EA2F0` | 토글 on, 슬라이더 채움, 켜짐 타일 아이콘 배경, 로고 박스, 상태 문구·링크 텍스트 **(버튼 배경 금지)** |
| accent-soft *(확장)* | `--color-accent-soft` | `#E6ECF7` | `#1B2540` | 켜짐 타일 배경, "켜짐" 뱃지 배경, 활성 하단탭 아이콘 배경 |
| bg | `--color-bg` | `#F4F5F2` | `#101214` | 페이지 배경 |
| bg-soft | `--color-bg-soft` | `#EAECE7` | `#181B1E` | 패널, 세그먼트 탭 트랙, 스탯 행, 아이콘 박스, hover 배경 |
| surface | `--color-surface` | `#FFFFFF` | `#1D2024` | 카드·타일·인풋·다이얼로그 |
| text | `--color-text` | `#1A1C1E` | `#ECEEEA` | 본문·제목 |
| muted | `--color-muted` | `#5F6773` | `#9AA3AE` | 보조 설명, 라벨, 비활성 탭 |
| border | `--color-border` | `#E1E4DF` | `#2A2E33` | 1px 선, 카드 테두리 |
| success | `--color-success` | `#15803D` | `#4ADE80` | Online 뱃지, 성공 문구, 증감 표시 |
| warning | `--color-warning` | `#DC6803` | `#FDBA74` | 응답 지연 등 주의 뱃지 |
| danger | `--color-danger` | `#DC2626` | `#F87171` | 삭제 버튼, 검증 오류, LIVE 뱃지 |
| info | `--color-info` | `#2563EB` | `#60A5FA` | 포커스 링, 정보 뱃지 |

- `--color-accent-soft`는 canonical 토큰 밖의 **프로젝트 확장 토큰**이다(IoT 켜짐 상태 전용).
- 시맨틱 틴트 배경은 `color-mix(in srgb, <시맨틱색> 14%, var(--color-surface))`로 파생한다(별도 토큰 없음).
- 다크 모드는 `@media (prefers-color-scheme: dark)`(현재 프로젝트 방식)로 같은 변수에 dark 값을 넣는다.
- 대비: text/bg 15.6:1, muted/bg 5.4:1, success·danger·info on white ≥ 4.5:1 (AA). 네이비/white 13:1, 네이비/accent-soft 10.9:1 — 텍스트로도 안전. 다크 secondary/surface 6.5:1.

### 타이포

| 역할 | 변수 | 값 | 굵기·행간 | 용도 |
|---|---|---|---|---|
| 서체 | `--font-sans` | `"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif` | — | 전체 |
| 4xl | `--text-4xl` | 44px | bold / tight, 자간 −0.03em | 대표 수치(오늘 사용량·현재 전력) |
| 3xl | `--text-3xl` | 32px | bold / tight, 자간 −0.02em | 페이지 제목 |
| 2xl | `--text-2xl` | 26px | bold / tight, 자간 −0.02em | 타일 수치, 보조 스탯 |
| xl | `--text-xl` | 20px | bold / 1.25 | 섹션(그룹) 제목 |
| lg | `--text-lg` | 18px | semibold / normal | 다이얼로그 제목, 헤더 타이틀 |
| base | `--text-base` | 16px | regular / normal | 본문, 기기 이름, 인풋 |
| sm | `--text-sm` | 14px | medium / normal | 버튼·칩·탭·보조 설명 |
| xs | `--text-xs` | 12px | medium / normal | 뱃지·검증 문구·스탯 라벨 |
| eyebrow | (조합) | 11px | semibold, 자간 .08em, uppercase, muted | 스탯 라벨, 섹션 상단 라벨 |

| 변수 | 값 |
|---|---|
| `--leading-tight` / `--leading-normal` / `--leading-relaxed` | 1.15 / 1.5 / 1.7 |
| `--weight-regular` / `--weight-medium` / `--weight-semibold` / `--weight-bold` | 400 / 500 / 600 / 700 |

- 모든 수치는 `font-variant-numeric: tabular-nums`. 단위는 수치 옆에 muted·작은 크기로 분리.

### 간격

| 변수 | 값 | 용도 |
|---|---|---|
| `--space-xs` | 4px | 아이콘-텍스트 미세 간격, 라벨-값 |
| `--space-sm` | 8px | 버튼 내부 gap, 칩 사이, 버튼 사이 |
| `--space-md` | 12px | 타일 그리드 gap, 타일 내부 요소 간격 |
| `--space-lg` | 16px | 타일·카드 패딩, 페이지 좌우 여백(모바일) |
| `--space-xl` | 24px | 카드 패딩(대), 다이얼로그 패딩, 페이지 좌우(데스크톱) |
| `--space-2xl` | 40px | 섹션 사이 |

### 라운드

| 변수 | 값 | 용도 |
|---|---|---|
| `--radius-sm` | 8px | 아이콘 박스, sm 버튼, 스켈레톤 |
| `--radius-md` | 12px | 버튼, 인풋, 패널, 스탯 행 |
| `--radius-lg` | 16px | 타일·카드, 다이얼로그, 라이브 뷰 |
| `--radius-full` | 999px | 칩, 뱃지, 토글, 세그먼트 탭, 전원 버튼(50%) |

### 섀도우

| 변수 | 값 | 용도 |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(26,28,30,.05)` | 활성 세그먼트 탭, 토글 썸 |
| `--shadow-md` | `0 4px 14px rgba(26,28,30,.07)` | 타일 hover |
| `--shadow-lg` | `0 14px 36px rgba(26,28,30,.12)` | 다이얼로그 |

기본 상태의 카드/타일은 그림자 없이 `1px border` + 배경 톤 차이로만 구분한다.

### 브레이크포인트

| 이름 | 값 | 타일 그리드 |
|---|---|---|
| (base) | < 640 | 2열(gap 12), 페이지 패딩 16 |
| sm | 640 | 2열 |
| md | 768 | 3열 |
| lg | 1024 | 3열(최대), 콘텐츠 최대폭 1024 |
| xl | 1280 | 3열 |

## 컴포넌트 인벤토리

### 디바이스 타일 (DeviceTile)
- 용도: 메인·기기관리의 기기 1개. 아이콘 박스(좌상) + 전원 버튼(우상) + 이름/보조 설명(하단) + 선택적 수치.
- 변형: `on`(accent-soft 배경 + **secondary 1px 테두리**, 아이콘 박스 secondary + 흰 아이콘) / `off`(surface) / `offline`(점선 테두리, muted, 컨트롤 disabled) / `camera`(카메라 아이콘. 하단 행(구분선 아래, 메인 표시 버튼과 같은 줄) **맨 오른쪽에 chevron 아이콘 버튼**(outline icon-sm)이 상세 링크. 카드 자체는 링크 아님. **목록에서는 미리보기 없음** — 라이브 뷰는 상세 페이지에서만) / `error`(점선, 중앙 정렬 안내 + "메인에서 제외") / `loading`(스켈레톤)
- 상태: 기본 / hover(shadow-md, translateY −1px) / focus(내부 컨트롤에 위임)
- 하단 행(footer): 1px 구분선 아래. 기기관리에서는 "메인에 표시"(outline sm, 표시 중이면 accent-soft + 네이비 별) + 그룹 버튼(ghost sm) — "메인에 표시"를 누르면 **그룹 선택 모달**이 먼저 뜨고 고르면 그 그룹으로 추가. 표시 중일 때 다시 누르면 같은 모달(그룹 변경)이 뜨고, 모달 하단 왼쪽 "메인에서 해제"(ghost, danger 글자)로 뺀다. 상세 링크(chevron)는 이 행 맨 오른쪽.
- 그리드: 모바일 2열 → md 이상 3열(최대), gap 12.
- 규칙: Do — 켜짐은 배경색, 온라인 여부는 뱃지·점선으로 분리. 이름 한 줄 말줄임. min-height 160. / Don't — 꺼진 타일에 색 주기, 상단 액션 영역에 버튼 3개 이상(전원 + 보조 1개까지).

### 카메라 라이브 뷰 (LiveView)
- 용도: 카메라 상세 상단. 16:9 검정 배경 뷰, 좌상단 LIVE 뱃지, 연결 중/오류 오버레이(흰 텍스트 + 스피너).
- 액션: 하단 버튼 2개 — primary "스냅샷", secondary "다시 시도".
- 규칙: Do — 오버레이 문구는 한 줄 + 재시도 버튼. / Don't — 뷰 위에 컨트롤 겹치기(뱃지 제외).

### 버튼 (Button)
- 용도: 액션. 높이 40(기본) / 32(sm). 라운드 md(기본) / sm(작은 버튼). 아이콘 16px, gap 8.
- 변형: `primary`(잉크 채움, 흰 글자) / `secondary`(surface + border) / `ghost`(투명, muted 글자) / `danger`(빨강 채움) / `icon`(정사각 40·32)
- 상태: 기본 / hover(primary→primary-strong, secondary·ghost→bg-soft) / focus(`outline: 2px solid info; offset 2px`) / disabled(opacity .45)
- 규칙: Do — 화면당 primary 1개, 로딩 시 텍스트 유지 + 스피너. / Don't — 네이비 배경 버튼(잉크 유지), 그라데이션·글로우, pill 라운드(칩과 혼동).

### 토글 스위치 (Switch)
- 용도: on/off 제어. 52×30(기본), 64×36(lg, 상세 페이지). 트랙 off `#C9CEC7` → on secondary. 썸 흰색 + 작은 그림자.
- 상태: 기본 / hover(brightness .95) / focus(info 링) / disabled(opacity .45)
- 규칙: Do — 낙관적 업데이트, 실패 시 되돌리고 `toast.error`. `role="switch" aria-checked`. / Don't — 같은 타일에 토글 + 전원 버튼 동시 배치.

### 전원 버튼 (PowerButton)
- 용도: 타일 우상단 코너 40px 원형. off = surface + border + muted 아이콘, on = primary 채움 + 흰 아이콘.
- 상태: 기본 / hover(off: border·아이콘 진하게, on: primary-strong) / focus(info 링) / disabled(opacity .45, 오프라인)
- 규칙: Do — `aria-label` "켜기/끄기". / Don't — 오프라인일 때 숨기기(disabled로 남긴다).

### 슬라이더 (Slider)
- 용도: 밝기·레벨. 트랙 8px pill, 채움 secondary(0→값), 나머지 `#C9CEC7`. 썸 24px 흰색 + 2px primary 테두리.
- 상태: 기본 / focus(info 링, offset 4) / disabled(opacity .45)
- 규칙: Do — 위 행에 라벨(좌) + 현재값 %(우, tabular). / Don't — 트랙에 눈금·그라데이션.

### 내비 (Header + Tabs)
- 헤더: 36px 로고 박스(secondary 네이비 배경, 흰 아이콘) + 제목 18px bold + 부제 12px muted, 우측 ghost sm "로그아웃".
- 주 탭(세그먼트): 홈 / 기기관리 / 그룹관리. bg-soft 트랙(pill, 패딩 4) 안에 pill 탭 36px. 활성 = surface + shadow-sm + text, 비활성 = muted.
- 2차 탭(언더라인): 높이 40, 하단 2px primary 선. Matter / SmartThings 전환용.
- 모바일 하단 탭바(선택): 3열, 아이콘 + 11px 라벨, 활성 아이콘 배경 accent-soft pill.
- 상태: 기본 / hover(글자 text) / focus(info 링) / active(`aria-current="page"`)
- 규칙: Do — 주 탭은 2~4개. / Don't — 탭 활성 색에 네이비 사용(활성 = 잉크), 주 탭과 2차 탭 스타일 혼용.

### 방·그룹 칩 (Chip)
- 용도: 메인 상단 그룹 필터. 높이 36, 좌우 14, pill, border. 개수는 11px 숫자(opacity .65).
- 변형: 기본 / `active`(primary 채움, 흰 글자) / `add`(점선, muted, + 아이콘)
- 상태: 기본 / hover(bg-soft, active는 primary-strong) / focus(info 링) / disabled(opacity .45)
- 규칙: Do — 선택 상태는 URL 쿼리(nuqs). 넘치면 가로 스크롤(`scroll-snap`). / Don't — 줄바꿈, 활성 칩에 네이비(활성 = 잉크).

### 뱃지 (Badge)
- 용도: 상태 표시. 높이 24, pill, 12px medium, 좌측 6px 상태 점(`::before`, currentColor).
- 변형: `online`(success 14% 틴트) / 기본 Offline(bg-soft + muted) / `on`(accent-soft, 점만 secondary) / `live`(danger 12% 틴트) / `warn` / `info` / `plain`(점 없음, 소스 라벨 Matter·SmartThings)
- 규칙: Do — 뱃지 1개 = 상태 1개, 위치 고정. / Don't — 클릭 가능한 뱃지, 대문자 남발(LIVE 예외).

### 스탯 (Stat / EnergySummary / StatRow)
- Stat: eyebrow 라벨(11px) + 값 44px bold(자간 −.03em, line-height 1) + 단위 18px muted + 선택적 12px 증감(success/danger).
- EnergySummary: 4열 그리드(1.4fr 1fr 1fr 1fr), surface 카드. 첫 칸 대표 수치 44px, 나머지 26px, 칸 사이 1px 세로선.
- StatRow(타일 내부): bg-soft 패널, 3열, 라벨 12px muted + 값 14px semibold tabular.
- 규칙: Do — 값 없음 "—", 오프라인 opacity .6. / Don't — 화면에 44px 수치 2곳 이상, 수치에 색.

### 폼 (Input / Field / Checkbox)
- Input: 높이 42, 좌우 14, radius md, border 1px, 16px. placeholder `#9AA1A9`.
- 상태: 기본 / hover(border `#B9BFB7`) / focus(border primary + `0 0 0 3px primary 12%`) / invalid(`aria-invalid="true"`, border danger, 포커스 링 danger 15%) / disabled(bg-soft, muted)
- Field: 라벨 14px medium 위, 힌트 12px muted / 오류 12px danger 아래. 인라인 폼은 `input-row`(인풋 flex:1 + 버튼).
- Checkbox: 20px, radius 6, 체크 시 primary 채움 + 흰 체크.
- 규칙: Do — zod 스키마 → `z.infer`, 서버 오류는 `errors.root`. / Don't — placeholder를 라벨 대용, 테두리 없는 인풋.

### 다이얼로그 (ConfirmDialog)
- 용도: `useConfirm`. 오버레이 `rgba(26,28,30,.5)`, 박스 max-width 400, radius lg, 패딩 24, shadow-lg.
- 구성: 제목 18px bold(질문형) + 설명 14px muted + 우측 정렬 액션(ghost "취소" + primary/danger 확인).
- 규칙: Do — 확인 버튼 라벨은 동사(삭제·제거), `role="alertdialog"`. / Don't — 우상단 X 아이콘, 버튼 3개 이상.

### 섹션 헤더 · 빈 상태
- 섹션 헤더: 20px bold + 개수 14px muted(baseline 정렬). 섹션 간격 40.
- 빈 상태: 점선 border 카드, 패딩 40/24, 중앙 정렬. 제목 16px text + 설명 14px muted + 밑줄 링크.

## 적용 힌트

- 클래스 네이밍(가이드 HTML 기준): `.tile`, `.tile--on|--offline|--camera|--error`, `.power`, `.switch`, `.slider`, `.btn`, `.btn--primary|--secondary|--ghost|--danger|--sm|--icon`, `.tabs > .tab`, `.subtabs > .subtab`, `.chip`, `.chip--active|--add`, `.badge`, `.badge--online|--on|--live|--warn|--info|--plain`, `.stat`, `.summary`, `.stat-row`, `.field`, `.input`, `.dialog`, `.empty`, `.eyebrow`
- 권장 컴포넌트명(React): `DeviceTile`, `PowerButton`, `Switch`, `Slider`, `Button`, `NavTabs`(세그먼트), `SubTabs`, `RoomChips`, `Badge`, `Stat`, `EnergySummary`, `StatRow`, `Input`, `Field`, `ConfirmDialog`, `EmptyState`, `LiveView`
- 현재 프로젝트 매핑: `globals.css`의 `--background/--foreground/--card/--muted/--border/--primary/--ring/--success/--danger` → 위 canonical 변수로 교체하고 `@theme inline`에서 `--color-*`로 노출. `--color-accent-soft`, `--color-secondary`, `--color-warning`, `--color-info` 추가. `DeviceCard`/`SmartThingsDeviceCard`/`UnavailableDeviceCard` → `DeviceTile` 변형으로 통합, `OnlineBadge` → `Badge`, `EnergyStats` → `StatRow`, `NavTabs` → 세그먼트 탭(주) + 언더라인(2차).
- 포커스 링은 전역 `:focus-visible { outline: 2px solid var(--color-info); outline-offset: 2px }`.
- 아이콘: lucide-react, 타일 아이콘 20px, 버튼 16px, stroke 2.

## 가이드 링크

- 스타일가이드: design/style-guide.html
- 컴포넌트가이드: design/component-guide.html
