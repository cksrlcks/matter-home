import { Cpu, Lightbulb, Plug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatWatts, splitUnit } from "@/lib/energy";
import type { DeviceDto } from "@/types/matter";

import { DashboardControl } from "./dashboard-control";
import { DeviceName } from "./device-name";
import { DeviceTile, TileValue } from "./device-tile";
import { EnergyStats } from "./energy-stats";
import { PowerSwitch } from "./power-switch";
import { RemoveDeviceButton } from "./remove-device-button";

// Descriptor device type 이름으로 아이콘을 고른다. (lib/matter/device-types.ts)
function deviceIcon(device: DeviceDto) {
  const types = device.endpoints.map((e) => e.deviceType ?? "");
  if (types.some((t) => t.includes("Light"))) return <Lightbulb />;
  if (device.energy || types.some((t) => t.includes("Plug"))) return <Plug />;
  return <Cpu />;
}

type Props = {
  device: DeviceDto;
  /** 기기관리 화면: 이름 변경·제거·측정값·메인 표시 설정을 노출 */
  manage?: boolean;
  className?: string;
};

export function DeviceCard({ device, manage, className }: Props) {
  const state = !device.online ? "offline" : device.power?.on ? "on" : "off";

  const watts =
    device.energy && device.online
      ? formatWatts(device.energy.activePowerW)
      : null;
  const [num, unit] = watts ? splitUnit(watts) : ["", ""];

  const stateLabel = !device.power
    ? "On/Off 미지원"
    : device.power.on
      ? "켜짐"
      : "꺼짐";

  return (
    <DeviceTile
      state={state}
      icon={deviceIcon(device)}
      title={
        manage ? (
          <DeviceName
            nodeId={device.nodeId}
            name={device.name}
            matterName={device.matterName}
            customName={device.customName}
          />
        ) : (
          device.name
        )
      }
      subtitle={
        device.online ? (
          [stateLabel, device.vendorName ?? "Matter"].join(" · ")
        ) : (
          <Badge>Offline</Badge>
        )
      }
      actions={
        <>
          {device.power && (
            <PowerSwitch
              nodeId={device.nodeId}
              power={device.power}
              disabled={!device.online}
            />
          )}
          {manage && (
            <RemoveDeviceButton nodeId={device.nodeId} name={device.name} />
          )}
        </>
      }
      value={watts && <TileValue value={num} unit={unit} />}
      footer={
        manage && <DashboardControl source="matter" deviceId={device.nodeId} />
      }
      className={className}
    >
      {manage && device.energy && (
        <EnergyStats energy={device.energy} online={device.online} />
      )}

      {manage && process.env.NODE_ENV !== "production" && (
        <p className="text-xs text-muted-foreground">Node ID: {device.nodeId}</p>
      )}
    </DeviceTile>
  );
}
