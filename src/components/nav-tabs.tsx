import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Matter" },
  { href: "/smartthings", label: "SmartThings" },
];

export function NavTabs({ active }: { active: string }) {
  return (
    <nav className="mb-6 flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab.href === active
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
