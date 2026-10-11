import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "outline" | "ghost" | "danger";
export type ButtonSize = "default" | "sm" | "icon" | "icon-sm";

const VARIANT: Record<ButtonVariant, string> = {
  // ghost를 뺀 버튼은 스티커(잉크 외곽선 + 그림자)이고 누르면 눌린다.
  default:
    "sticker-press border-ink bg-primary text-primary-foreground shadow-sm hover:bg-primary-strong",
  outline:
    "sticker-press border-ink bg-card text-foreground shadow-sm hover:bg-muted",
  ghost: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "sticker-press border-ink bg-danger text-white shadow-sm hover:bg-danger/90",
};

const SIZE: Record<ButtonSize, string> = {
  default: "h-10 rounded-xl px-4 text-sm",
  sm: "h-8 rounded-lg px-3 text-xs",
  icon: "size-10 rounded-xl",
  "icon-sm": "size-8 rounded-lg",
};

// <Link> 등 버튼이 아닌 요소에 같은 스타일을 입힐 때 사용
export function buttonClassName({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 border-2 font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
