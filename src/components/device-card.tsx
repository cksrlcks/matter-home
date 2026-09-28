import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeviceDto } from "@/types/matter";

import { DeviceName } from "./device-name";
import { PowerSwitch } from "./power-switch";
import { RemoveDeviceButton } from "./remove-device-button";

function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        online
          ? "bg-success/15 text-success"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online ? "bg-success" : "bg-muted-foreground",
        )}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function DeviceCard({ device }: { device: DeviceDto }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <DeviceName
            nodeId={device.nodeId}
            name={device.name}
            matterName={device.matterName}
            customName={device.customName}
          />
          {device.vendorName && (
            <p className="truncate text-sm text-muted-foreground">
              {device.vendorName}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <OnlineBadge online={device.online} />
          <RemoveDeviceButton nodeId={device.nodeId} name={device.name} />
        </div>
      </div>

      {device.power ? (
        <PowerSwitch
          nodeId={device.nodeId}
          power={device.power}
          disabled={!device.online}
        />
      ) : (
        <p className="rounded-lg bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
          On/Off를 지원하지 않는 기기입니다.
        </p>
      )}

      {process.env.NODE_ENV !== "production" && (
        <p className="text-xs text-muted-foreground">Node ID: {device.nodeId}</p>
      )}
    </Card>
  );
}
