import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "outline" | "ghost" | "danger";
export type ButtonSize = "default" | "sm" | "icon" | "icon-sm";

const VARIANT: Record<ButtonVariant, string> = {
  // 캡슐 버튼. default = 라임 채움(화면당 1개), outline = 회색 채움(보조).
  default: "press bg-primary text-primary-foreground hover:bg-primary-strong",
  outline: "press bg-muted text-foreground hover:bg-border",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "press bg-danger text-white hover:bg-danger/90",
};

const SIZE: Record<ButtonSize, string> = {
  default: "h-10 rounded-full px-4.5 text-sm",
  sm: "h-8 rounded-full px-3.5 text-xs",
  icon: "size-10 rounded-full",
  "icon-sm": "size-8 rounded-full",
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
    "inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
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
