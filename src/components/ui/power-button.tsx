"use client";

import { Loader2, Power } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  on: boolean;
  onClick: () => void;
  /** 요청 중: 스피너 + 클릭 잠금 */
  pending?: boolean;
  disabled?: boolean;
  className?: string;
};

// 디바이스 타일 우상단 40px 원형 전원 버튼. on = 노랑 스티커, off = 카드색.
export function PowerButton({ on, onClick, pending, disabled, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-pressed={on}
      aria-label={on ? "끄기" : "켜기"}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        on
          ? "border-ink bg-tile-light text-tile-ink shadow-sm"
          : "border-ink bg-card text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="size-4.5 animate-spin" />
      ) : (
        <Power className="size-4.5" strokeWidth={2.2} />
      )}
    </button>
  );
}
