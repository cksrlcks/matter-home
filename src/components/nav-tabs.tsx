"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavTab = {
  href: string;
  label: string;
  /** true면 하위 경로에서도 활성 (기본: 정확히 일치할 때만) */
  prefix?: boolean;
};

type Props = {
  tabs: NavTab[];
  /** segment = 주 메뉴(pill 세그먼트), underline = 2차 탭(밑줄) */
  variant?: "segment" | "underline";
  className?: string;
};

export function NavTabs({ tabs, variant = "segment", className }: Props) {
  const pathname = usePathname();
  const isActive = (tab: NavTab) =>
    pathname === tab.href || (!!tab.prefix && pathname.startsWith(`${tab.href}/`));

  if (variant === "underline") {
    return (
      <nav className={cn("mb-6 flex gap-0.5 border-b border-border", className)}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive(tab) ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex h-10 items-center border-b-2 px-3.5 text-sm font-medium transition-colors",
              isActive(tab)
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      className={cn("mb-6 flex w-fit gap-1 rounded-full bg-muted p-1", className)}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isActive(tab) ? "page" : undefined}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-full px-4.5 text-sm leading-none font-semibold transition-colors",
            isActive(tab)
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
