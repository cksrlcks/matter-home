import { AddDeviceButton } from "@/components/add-device-button";
import { DeviceList } from "@/components/device-list";
import { LogoutButton } from "@/components/logout-button";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matter Home</h1>
          <p className="text-sm text-muted-foreground">Matter 기기 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <AddDeviceButton />
          <LogoutButton />
        </div>
      </header>
      <DeviceList />
    </main>
  );
}
