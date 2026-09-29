# 적용 가이드 (user)

기반: `src/app/globals.css`(토큰, 라이트/다크) · `src/app/layout.tsx`(Pretendard next/font) ·
`src/components/ui/`(button · card · input · badge · switch · power-button · stat · dialog) ·
`src/components/device-tile.tsx`(디바이스 타일) · `group-picker-dialog.tsx`(그룹 선택 모달)
샘플 적용 완료:
- 메인 대시보드 `src/app/(app)/page.tsx` + `(app)/layout.tsx` — 헤더(네이비 로고), 세그먼트 탭(홈/기기관리/그룹관리), 타일, 에너지 요약, 빈 상태
- 기기관리 타일 하단 행 `components/dashboard-control.tsx` — "메인에 표시" 버튼 → 그룹 선택 모달(하단 "메인에서 해제")
- 그룹관리 페이지 `src/app/(app)/groups/page.tsx` + `components/group-manager.tsx` — 목록 카드, 그룹 추가 모달, 인라인 이름 변경
- SmartThings/Matter 카드 `smartthings-device-card.tsx` · `device-card.tsx` — DeviceTile 변형(카메라는 하단 행 오른쪽 chevron 버튼)

규격은 [DESIGN.md](../DESIGN.md), 눈으로 볼 견본은 [style-guide.html](style-guide.html) · [component-guide.html](component-guide.html).

## 토큰 ↔ 유틸 매핑 (치환 시 참고)

| DESIGN.md | Tailwind 유틸 | 비고 |
|---|---|---|
| bg / bg-soft / surface | `bg-background` / `bg-muted` / `bg-card` | |
| text / muted / border | `text-foreground` / `text-muted-foreground` / `border-border` | |
| primary / primary-strong | `bg-primary` / `hover:bg-primary-strong` | 버튼·활성 칩·전원 on |
| secondary (네이비) / accent-soft | `bg-secondary` / `bg-accent-soft` | 켜짐 타일(배경+테두리)·토글·로고. **버튼 배경 금지** |
| success / warning / danger / info | 같은 이름 | 포커스 링 = info (전역 `:focus-visible`) |
| radius sm 8 / md 12 / lg 16 / full | `rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-full` | 기존 `rounded-md`(6px)는 쓰지 않는다 |
| text 2xl 26 / 3xl 32 / 4xl 44 | `text-2xl` / `text-3xl` / `text-4xl` | globals.css에서 재정의됨 |
| shadow sm / md / lg | `shadow-sm` / `shadow-md` / `shadow-lg` | 기본 카드는 그림자 없음 |
| eyebrow | `<Eyebrow>` (ui/stat.tsx) | 11px 대문자 라벨 |
| 타일 그리드 | `grid grid-cols-2 gap-3 md:grid-cols-3`(홈) / `gap-3 sm:grid-cols-2 md:grid-cols-3`(관리) | 최대 3열 |

## 남은 화면 (우선순위 순)

- [ ] `components/device-list.tsx` — 로딩 스피너를 스켈레톤 타일(`dashboard-matter-card.tsx` 참고)로, 오류/빈 상태를 메인의 점선 빈 상태 마크업으로. 그리드는 완료.
- [ ] `components/device-name.tsx` — 편집 모드 아이콘 버튼(`rounded-md p-1.5`)을 `<Button variant="ghost" size="icon-sm">`로; `h2.text-lg`는 타일 제목 크기(`text-base font-semibold`)로. (참고: 27행 `useEffect` 안 `setValue`가 `react-hooks/set-state-in-effect` lint 오류 — 편집 시작 핸들러에서 값을 세팅하도록 옮기면 해결)
- [ ] `src/app/(app)/devices/smartthings/page.tsx` — 오류/빈 상태 `<p>`를 점선 빈 상태 카드로. 그리드는 완료.
- [ ] `src/app/(app)/devices/smartthings/[deviceId]/page.tsx` — DESIGN.md "카메라 라이브 뷰": 상단 카드에 `LivePlayer` + 좌상단 `<Badge variant="live">LIVE</Badge>`, 아래 액션 2개(`SnapshotButton` primary + 다시 시도 outline). "카메라 전원" 카드는 `<SmartThingsSwitch appearance="switch" />`. `rounded-lg`→`rounded-xl`, 안내 문구 박스 `bg-muted rounded-lg`→`rounded-xl`. "← 목록" 링크는 `text-sm text-muted-foreground hover:text-foreground`.
- [ ] `components/live-player.tsx` — 컨테이너 `rounded-lg`→`rounded-2xl`; 오버레이 재시도 버튼은 `variant="outline"` 유지(검정 위라 `border-white/30 bg-transparent text-white` 추가).
- [ ] `components/snapshot-button.tsx` — 변경 불필요(Button 자동 반영). 아이콘 크기 클래스(`h-4 w-4`)는 제거해도 됨(`[&_svg]:size-4`).
- [ ] `components/commission-dialog.tsx` + `add-device-button.tsx` — Dialog/Button/Input 자동 반영. 검색 결과 목록 항목 `rounded-md/lg`→`rounded-xl`, 선택 항목 강조는 `border-secondary bg-accent-soft`(켜짐 타일과 동일). 취소 버튼은 `variant="ghost"`.
- [ ] `src/app/login/page.tsx` + `components/login-form.tsx` — 카드 `shadow-sm` 제거, 제목 `text-xl`→`text-2xl font-bold tracking-[-.02em]`, 상단에 헤더와 같은 네이비 로고 박스(`size-12 rounded-xl bg-secondary`) 추가. 오류 문구 `text-sm`→`text-xs text-danger`.
- [ ] `components/daily-energy-chart.tsx` — 막대 색 `bg-primary`, 오늘 막대 `bg-primary/45`→`bg-secondary/60`(진행 중 표시), 호버 막대 `bg-secondary`. 라벨은 `<Eyebrow>`.
- [ ] `components/energy-summary.tsx`(나머지) — 플러그별 비중 바: 트랙 `bg-muted`, 채움 `bg-secondary`. 접힘 헤더의 `h2 > button`은 그대로.
- [ ] 모바일 하단 탭바(선택) — DESIGN.md 내비 항목 참고해 `(app)/layout.tsx`에 `md:hidden` 탭바(홈/기기관리/그룹관리) 추가.

## 화면당 절차

1. 하드코딩 색·간격·폰트를 토큰 유틸로 치환 (`text-primary`로 강조한 수치 → `text-foreground`, `bg-black/50` 오버레이는 유지).
2. 반복 UI를 기본 컴포넌트로 교체: 원시 `<button>` → `Button`(variant/size), 상태 텍스트 → `Badge`, 큰 수치 → `Stat`/`TileValue`, 기기 카드 → `DeviceTile`, 선택 UI → `Dialog`(그룹 선택은 `GroupPickerDialog`).
3. 상태(hover/disabled/focus)를 DESIGN.md 규칙대로 확인 — 포커스 링은 전역이므로 개별 `focus-visible:ring-*` 클래스는 제거.
4. 대비·정렬·모바일(홈 2열 / 관리 1열)을 육안 점검. `design/component-guide.html`과 나란히 비교.

## 주의

- `rounded-md`(6px)는 시스템 밖 값이다. 새 코드에서는 `rounded-lg` 이상만 쓴다.
- 네이비(`secondary`)는 켜짐·활성·링크 전용. `Button`에는 `default`(잉크)/`outline`/`ghost`/`danger`만 있다.
- 44px 수치(`<Stat emphasis>`)는 화면당 1곳.
- `Dialog`는 body 포털로 뜬다 — 타일처럼 `transform`이 걸리는 요소 안에서 모달을 열어도 된다.
