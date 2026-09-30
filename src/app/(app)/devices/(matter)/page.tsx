import { connection } from "next/server";

import { AddDeviceButton } from "@/components/add-device-button";
import { DeviceList } from "@/components/device-list";

export default async function MatterDevicesPage() {
  await connection();
  if (process.env.EXTERNAL_MODE === "true") {
    return (
      <p className="text-sm text-muted-foreground">
        외부 환경 모드입니다. Matter 기기 목록은 표시되지 않습니다.
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <AddDeviceButton />
      </div>
      <DeviceList />
    </>
  );
}
