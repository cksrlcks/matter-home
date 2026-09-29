"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** 요청 중: 썸에 스피너 표시 + 클릭 잠금 */
  pending?: boolean;
  disabled?: boolean;
  size?: "default" | "lg";
  "aria-label"?: string;
  className?: string;
};

// 토글 스위치. on = 네이비(secondary). 오프라인 기기는 숨기지 말고 disabled로 남긴다.
export function Switch({
  checked,
  onCheckedChange,
  pending,
  disabled,
  size = "default",
  className,
  ...aria
}: Props) {
  const lg = size === "lg";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45",
        lg ? "h-9 w-16" : "h-7.5 w-13",
        checked ? "bg-secondary" : "bg-muted-foreground/40",
        className,
      )}
      {...aria}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[3px] left-[3px] inline-flex items-center justify-center rounded-full bg-white text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-transform",
          lg ? "size-7.5" : "size-6",
          checked && (lg ? "translate-x-7" : "translate-x-5.5"),
        )}
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />}
      </span>
    </button>
  );
}
