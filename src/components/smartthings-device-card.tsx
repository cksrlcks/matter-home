import type { ReactNode } from "react";
import { Camera, Cpu, Lightbulb, Plug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SmartThingsDevice } from "@/lib/smartthings";

import { DeviceTile } from "./device-tile";
import { SmartThingsSwitch } from "./smartthings-switch";

// 기기 종류·이름으로 아이콘을 고른다. c2c-switch는 대부분 조명이라 전구를 기본으로 둔다.
function deviceIcon(device: SmartThingsDevice, camera?: boolean) {
  if (camera) return <Camera />;
  const hint =
    `${device.deviceTypeName ?? ""} ${device.label ?? ""} ${device.name}`.toLowerCase();
  if (/plug|outlet|콘센트|플러그/.test(hint)) return <Plug />;
  if (/light|bulb|lamp|switch|등|조명/.test(hint)) return <Lightbulb />;
  return <Cpu />;
}

type Props = {
  device: SmartThingsDevice;
  /** 켜짐/꺼짐 제어 대상이 아니면 undefined, 상태를 모르면 null */
  switchOn?: boolean | null;
  /** 카메라면 하단 행 오른쪽에 상세(실시간) 페이지 화살표 버튼. 목록에서는 미리보기 없음 */
  camera?: boolean;
  /** 타일 하단 추가 영역 (기기관리의 메인 표시 설정 등) */
  footer?: ReactNode;
  className?: string;
};

export function SmartThingsDeviceCard({
  device,
  switchOn,
  camera,
  footer,
  className,
}: Props) {
  const name = device.label || device.name;
  const state = switchOn === null ? "offline" : switchOn ? "on" : "off";
  const subtitle = [device.manufacturerName, device.deviceTypeName ?? device.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <DeviceTile
      state={state}
      icon={deviceIcon(device, camera)}
      title={name}
      subtitle={switchOn === null ? <Badge>상태 없음</Badge> : subtitle}
      href={camera ? `/devices/smartthings/${device.deviceId}` : undefined}
      linkLabel={`${name} 실시간 보기`}
      actions={
        switchOn !== undefined && (
          <SmartThingsSwitch deviceId={device.deviceId} initialOn={switchOn} />
        )
      }
      footer={footer}
      className={className}
    />
  );
}
