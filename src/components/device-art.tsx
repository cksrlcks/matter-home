import type { DeviceKind } from "@/lib/device-kind";
import { cn } from "@/lib/utils";

// 기기 종류별 스티커 그림 (public/art/, 256px 투명 PNG).
// 여기에 등록되지 않은 종류는 아래의 SVG 그림으로 대신한다.
const ART_IMAGES: Partial<Record<DeviceKind, string>> = {
  light: "/art/light.png",
  plug: "/art/plug.png",
  switch: "/art/switch.png",
  camera: "/art/camera.png",
  tv: "/art/tv.png",
  other: "/art/other.png",
};

// 화면 장식용 장면 그림 (로그인, 빈 홈)
const SCENE_IMAGES = {
  house: "/art/house.png",
  empty: "/art/empty.png",
};

export function SceneArt({
  scene,
  className,
}: {
  scene: keyof typeof SCENE_IMAGES;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 정적 스티커 PNG
    <img
      src={SCENE_IMAGES[scene]}
      alt=""
      aria-hidden
      className={cn("size-24 shrink-0 object-contain", className)}
    />
  );
}

type Props = {
  kind: DeviceKind;
  /** false면 색을 빼고 흐리게 (꺼짐·오프라인) */
  on: boolean;
  className?: string;
};

const INK = "#1b1b1b";

export function DeviceArt({ kind, on, className }: Props) {
  const image = ART_IMAGES[kind];
  const tone = cn("size-16 shrink-0 transition-[filter,opacity]", !on && "opacity-55 grayscale", className);

  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- 작은 정적 스티커 PNG
    return <img src={image} alt="" aria-hidden className={cn(tone, "object-contain")} />;
  }

  return (
    <svg viewBox="0 0 56 56" aria-hidden className={tone}>
      {ART[kind](on)}
    </svg>
  );
}

// 켜지면 웃고, 꺼지면 눈을 감는다.
function Face({ cx, cy, on }: { cx: number; cy: number; on: boolean }) {
  return on ? (
    <>
      <circle cx={cx - 6} cy={cy} r="2.2" fill={INK} />
      <circle cx={cx + 6} cy={cy} r="2.2" fill={INK} />
      <path
        d={`M${cx - 6} ${cy + 7}q6 5 12 0`}
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  ) : (
    <path
      d={`M${cx - 9} ${cy}h6M${cx + 3} ${cy}h6M${cx - 4} ${cy + 8}h8`}
      stroke={INK}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  );
}

const stroke = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round" as const };

const ART: Record<DeviceKind, (on: boolean) => React.ReactNode> = {
  light: (on) => (
    <>
      <rect x="20" y="40" width="16" height="11" rx="3" fill={INK} />
      <circle cx="28" cy="23" r="19" fill="#fff" {...stroke} />
      <Face cx={28} cy={21} on={on} />
    </>
  ),
  plug: (on) => (
    <>
      <rect x="6" y="8" width="44" height="40" rx="13" fill="#fff" {...stroke} />
      <rect x="18" y="17" width="5" height="11" rx="2.5" fill={INK} />
      <rect x="33" y="17" width="5" height="11" rx="2.5" fill={INK} />
      <path
        d={on ? "M21 36q7 5 14 0" : "M23 38h10"}
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  ),
  switch: (on) => (
    <>
      <rect x="4" y="15" width="48" height="26" rx="13" fill="#fff" {...stroke} />
      <circle cx={on ? 39 : 17} cy="28" r="8.5" fill={INK} />
    </>
  ),
  camera: (on) => (
    <>
      <rect x="5" y="14" width="46" height="32" rx="10" fill="#fff" {...stroke} />
      <rect x="18" y="8" width="14" height="8" rx="3" fill={INK} />
      <circle cx="28" cy="30" r="10" fill={on ? "#8ec5ff" : "#fff"} {...stroke} />
      <circle cx="28" cy="30" r="3.5" fill={INK} />
    </>
  ),
  tv: (on) => (
    <>
      <rect x="4" y="9" width="48" height="32" rx="8" fill="#fff" {...stroke} />
      <path d="M18 49h20M28 41v8" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <Face cx={28} cy={23} on={on} />
    </>
  ),
  other: (on) => (
    <>
      <rect x="8" y="8" width="40" height="40" rx="12" fill="#fff" {...stroke} />
      <Face cx={28} cy={25} on={on} />
    </>
  ),
};
