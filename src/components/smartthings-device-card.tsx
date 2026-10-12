import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { smartThingsKind } from "@/lib/device-kind";
import { displayName, type SmartThingsDevice } from "@/lib/smartthings";

import { DeviceArt } from "./device-art";
import { SmartThingsDeviceName } from "./device-name";
import { DeviceTile } from "./device-tile";
import { SmartThingsSwitch } from "./smartthings-switch";

type Props = {
  device: SmartThingsDevice;
  /** 켜짐/꺼짐 제어 대상이 아니면 undefined, 상태를 모르면 null */
  switchOn?: boolean | null;
  /** 카메라면 하단 행 오른쪽에 상세(실시간) 페이지 화살표 버튼. 목록에서는 미리보기 없음 */
  camera?: boolean;
  /** 타일 하단 추가 영역 (기기관리의 메인 표시 설정 등) */
  footer?: ReactNode;
  /** 기기관리 화면: 앱 내 표시 이름 변경을 노출 */
  editableName?: boolean;
  className?: string;
};

export function SmartThingsDeviceCard({
  device,
  switchOn,
  camera,
  footer,
  editableName,
  className,
}: Props) {
  const name = displayName(device);
  const state = switchOn === null ? "offline" : switchOn ? "on" : "off";
  const subtitle = [device.manufacturerName, device.deviceTypeName ?? device.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <DeviceTile
      state={state}
      // 켜고 끌 수 없는 기기(카메라 등)는 색을 그대로 보여준다.
      icon={
        <DeviceArt
          kind={smartThingsKind(device, !!camera)}
          on={switchOn === undefined || switchOn === true}
        />
      }
      title={
        editableName ? (
          <SmartThingsDeviceName
            deviceId={device.deviceId}
            name={name}
            smartThingsName={device.label || device.name}
            customName={device.customName ?? null}
          />
        ) : (
          name
        )
      }
      subtitle={switchOn === null ? <Badge className="mt-1.5">상태 없음</Badge> : subtitle}
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
