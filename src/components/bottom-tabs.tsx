"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Lightbulb, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "홈", icon: House },
  { href: "/devices", label: "기기", icon: Lightbulb },
  { href: "/settings", label: "설정", icon: Settings },
];

// 화면 아래에 떠 있는 알약형 주 메뉴. 엄지가 닿는 위치에 둔다.
export function BottomTabs() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label="주 메뉴"
        className="pointer-events-auto flex gap-1 rounded-full border-2 border-ink bg-primary p-1.5 shadow-md"
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 min-w-20 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
                active
                  ? "bg-tile-light text-tile-ink"
                  : "text-primary-foreground/70 hover:text-primary-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={2.4} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
