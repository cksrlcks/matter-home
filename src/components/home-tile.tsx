"use client";

import type { ReactNode } from "react";
import { Ellipsis, Loader2 } from "lucide-react";

import { useLongPress } from "@/hooks/use-long-press";
import { KIND_STYLE, type DeviceKind } from "@/lib/device-kind";
import { cn } from "@/lib/utils";

import { DeviceArt } from "./device-art";

export type HomeTileState = "on" | "off" | "offline";

// 타일 바탕: 켜지면 종류별 포인트 색 틴트, 꺼지면 카드색, 오프라인은 흐리게.
export function tileSurfaceClass(kind: DeviceKind, state: HomeTileState) {
  return cn(
    "rounded-[22px]",
    state === "on" ? KIND_STYLE[kind].tint : "bg-card",
    state === "offline" && "opacity-55",
  );
}

// 타일의 상태 문구 색: 켜지면 포인트 색, 아니면 회색.
export function tileAccentClass(kind: DeviceKind, state: HomeTileState) {
  return state === "on" ? KIND_STYLE[kind].text : "text-muted-foreground";
}

type Props = {
  kind: DeviceKind;
  state: HomeTileState;
  title: string;
  subtitle?: ReactNode;
  /** 요청 중: 우상단에 스피너 */
  pending?: boolean;
  /** 타일을 눌렀을 때 (켜고 끄기 등). 없으면 누르면 onMore가 실행된다 */
  onPress?: () => void;
  /** 길게 누르거나 ⋯ 를 눌렀을 때 (상세 시트) */
  onMore?: () => void;
  className?: string;
};

// 홈 화면의 기기 위젯. 타일 전체가 버튼이라 폰에서 조준할 필요가 없다.
// 이름·상태는 위, 그림은 오른쪽 아래.
export function HomeTile({
  kind,
  state,
  title,
  subtitle,
  pending,
  onPress,
  onMore,
  className,
}: Props) {
  const longPress = useLongPress(onMore);
  const handleClick = () => {
    if (longPress.consumeClick()) return;
    (onPress ?? onMore)?.();
  };

  return (
    <div className={cn("press relative", tileSurfaceClass(kind, state), className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={onPress ? state === "on" : undefined}
        className="flex min-h-40 w-full touch-manipulation flex-col justify-between gap-3 rounded-[inherit] p-5 text-left select-none [-webkit-touch-callout:none]"
        {...longPress.handlers}
      >
        <span className="block w-full min-w-0 pr-8">
          <span className="line-clamp-2 text-[15px] leading-tight font-bold break-keep">
            {title}
          </span>
          {subtitle && (
            <span
              className={cn(
                "mt-1 block truncate text-sm font-semibold tabular-nums",
                tileAccentClass(kind, state),
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
        <DeviceArt kind={kind} on={state === "on"} className="self-end" />
      </button>
      {pending ? (
        <span className="absolute top-3 right-3 grid size-9 place-items-center">
          <Loader2 className="size-4.5 animate-spin" />
        </span>
      ) : (
        onMore && (
          <button
            type="button"
            onClick={onMore}
            aria-label={`${title} 설정`}
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <Ellipsis className="size-5" strokeWidth={2.6} />
          </button>
        )
      )}
    </div>
  );
}
