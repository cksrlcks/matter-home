import { BottomTabs } from "@/components/bottom-tabs";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* 하단 탭에 가려지지 않도록 아래 여백을 넉넉히 둔다. */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 sm:pt-10">
        {children}
      </main>
      <BottomTabs />
    </>
  );
}
