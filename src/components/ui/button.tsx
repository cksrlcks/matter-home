import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "outline" | "ghost" | "danger";
export type ButtonSize = "default" | "sm" | "icon" | "icon-sm";

const VARIANT: Record<ButtonVariant, string> = {
  // 화면당 primary(잉크) 1개. 네이비(secondary)는 버튼 배경으로 쓰지 않는다.
  default: "bg-primary text-primary-foreground hover:bg-primary-strong",
  outline: "border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "bg-danger text-white hover:bg-danger/90",
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
    "inline-flex shrink-0 items-center justify-center gap-2 border border-transparent font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
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
