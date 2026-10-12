import { Badge } from "@/components/ui/badge";
import { matterKind } from "@/lib/device-kind";
import { formatWatts, splitUnit } from "@/lib/energy";
import type { DeviceDto } from "@/types/matter";

import { DashboardControl } from "./dashboard-control";
import { DeviceArt } from "./device-art";
import { DeviceName, SwitchName } from "./device-name";
import { DeviceTile, TileValue } from "./device-tile";
import { EnergyStats } from "./energy-stats";
import { PowerSwitch } from "./power-switch";
import { RemoveDeviceButton } from "./remove-device-button";

type Props = {
  device: DeviceDto;
  /** 기기 탭: 이름 변경·제거·측정값·홈 표시 설정을 노출 */
  manage?: boolean;
  className?: string;
};

export function DeviceCard({ device, manage, className }: Props) {
  const { switches } = device;
  // 1구는 타일 우상단 전원 버튼, 다구는 타일 안에 구별 행으로 표시한다.
  const single = switches.length === 1 ? switches[0] : null;
  const onCount = switches.filter((sw) => sw.on).length;
  const state = !device.online ? "offline" : onCount > 0 ? "on" : "off";

  const watts =
    device.energy && device.online
      ? formatWatts(device.energy.activePowerW)
      : null;
  const [num, unit] = watts ? splitUnit(watts) : ["", ""];

  const stateLabel =
    switches.length === 0
      ? "On/Off 미지원"
      : !single
        ? `${onCount}/${switches.length} 켜짐`
        : single.on
          ? "켜짐"
          : "꺼짐";

  return (
    <DeviceTile
      state={state}
      icon={<DeviceArt kind={matterKind(device)} on={state === "on"} />}
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
          <Badge className="mt-1.5">Offline</Badge>
        )
      }
      actions={
        <>
          {single && (
            <PowerSwitch
              nodeId={device.nodeId}
              power={single}
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
        manage && (
          <DashboardControl
            source="matter"
            deviceId={device.nodeId}
            endpointIds={switches.map((sw) => sw.endpointId)}
          />
        )
      }
      className={className}
    >
      {switches.length > 1 && (
        <ul className="flex flex-col gap-2 rounded-xl bg-muted px-4 py-3 group-data-[state=on]:bg-card/70">
          {switches.map((sw) => (
            <li
              key={sw.endpointId}
              className="flex items-center justify-between gap-2"
            >
              {manage ? (
                <SwitchName
                  nodeId={device.nodeId}
                  endpointId={sw.endpointId}
                  name={sw.name}
                  defaultName={sw.defaultName}
                  customName={sw.customName}
                />
              ) : (
                <span className="truncate text-sm font-medium">{sw.name}</span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                {manage && (
                  <DashboardControl
                    source="matter"
                    deviceId={device.nodeId}
                    endpointIds={switches.map((s) => s.endpointId)}
                    endpointId={sw.endpointId}
                    label={sw.name}
                  />
                )}
                <PowerSwitch
                  nodeId={device.nodeId}
                  power={sw}
                  disabled={!device.online}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {manage && device.energy && (
        <EnergyStats energy={device.energy} online={device.online} />
      )}

      {manage && process.env.NODE_ENV !== "production" && (
        <p className="text-xs text-muted-foreground">Node ID: {device.nodeId}</p>
      )}
    </DeviceTile>
  );
}
