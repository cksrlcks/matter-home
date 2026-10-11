import { NavTabs } from "@/components/nav-tabs";
import { PageHeader } from "@/components/page-header";

const TABS = [
  { href: "/devices", label: "Matter" },
  { href: "/devices/smartthings", label: "SmartThings", prefix: true },
];

export default function DevicesLayout({ children }: LayoutProps<"/devices">) {
  return (
    <>
      <PageHeader title="기기" description="등록된 기기를 관리하고 홈에 올려요" />
      <NavTabs tabs={TABS} variant="underline" className="mb-4" />
      {children}
    </>
  );
}
