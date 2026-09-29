import { NavTabs } from "@/components/nav-tabs";

const TABS = [
  { href: "/devices", label: "Matter" },
  { href: "/devices/smartthings", label: "SmartThings", prefix: true },
];

export default function DevicesLayout({ children }: LayoutProps<"/devices">) {
  return (
    <>
      <NavTabs tabs={TABS} variant="underline" className="mb-4" />
      {children}
    </>
  );
}
