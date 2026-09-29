import { House } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { NavTabs } from "@/components/nav-tabs";

const TABS = [
  { href: "/", label: "홈" },
  { href: "/devices", label: "기기관리", prefix: true },
  { href: "/groups", label: "그룹관리", prefix: true },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <House className="size-4.5" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-lg leading-tight font-bold tracking-[-.01em]">
              Matter Home
            </h1>
            <p className="text-xs text-muted-foreground">스마트홈 기기 관리</p>
          </div>
        </div>
        <LogoutButton />
      </header>
      <NavTabs tabs={TABS} />
      {children}
    </main>
  );
}
