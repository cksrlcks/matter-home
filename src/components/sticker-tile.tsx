"use client";

import type { ReactNode } from "react";
import { Ellipsis, Loader2 } from "lucide-react";

import { useLongPress } from "@/hooks/use-long-press";
import { KIND_TILE_CLASS, type DeviceKind } from "@/lib/device-kind";
import { cn } from "@/lib/utils";

import { DeviceArt } from "./device-art";

export type StickerTileState = "on" | "off" | "offline";

// 타일 바탕: 켜지면 종류별 원색, 꺼지면 색이 빠지고, 오프라인은 점선.
export function tileSurfaceClass(kind: DeviceKind, state: StickerTileState) {
  return cn(
    "sticker rounded-3xl",
    state === "on" ? cn(KIND_TILE_CLASS[kind], "text-tile-ink") : "bg-muted text-foreground",
    state === "offline" && "border-dashed shadow-none",
  );
}

type Props = {
  kind: DeviceKind;
  state: StickerTileState;
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

// 홈 화면의 기기 타일. 타일 전체가 버튼이라 폰에서 조준할 필요가 없다.
export function StickerTile({
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
    <div
      className={cn(
        "sticker-press relative",
        tileSurfaceClass(kind, state),
        className,
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={onPress ? state === "on" : undefined}
        className="flex min-h-36 w-full touch-manipulation flex-col items-start justify-between gap-3 rounded-[inherit] p-3.5 text-left select-none [-webkit-touch-callout:none]"
        {...longPress.handlers}
      >
        <DeviceArt kind={kind} on={state === "on"} />
        <span className="block w-full min-w-0">
          <span className="block truncate font-display text-lg leading-tight">
            {title}
          </span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-xs font-semibold opacity-70">
              {subtitle}
            </span>
          )}
        </span>
      </button>
      {pending ? (
        <span className="absolute top-2 right-2 grid size-9 place-items-center">
          <Loader2 className="size-4.5 animate-spin" />
        </span>
      ) : (
        onMore && (
          <button
            type="button"
            onClick={onMore}
            aria-label={`${title} 설정`}
            className="absolute top-2 right-2 grid size-9 place-items-center rounded-full opacity-60 transition-[opacity,background-color] hover:bg-black/10 hover:opacity-100"
          >
            <Ellipsis className="size-5" strokeWidth={2.6} />
          </button>
        )
      )}
    </div>
  );
}
