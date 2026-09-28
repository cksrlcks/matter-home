// 클라이언트/서버 공용 DTO. Matter Server raw 구조를 그대로 노출하지 않고
// 이 타입으로 normalize 해서 주고받는다. (server-only import 금지)

export type DeviceEndpointDto = {
  id: number;
  deviceType?: string;
};

export type DevicePowerDto = {
  /** OnOff cluster가 붙어 있는 endpoint (GRILLPLATS는 1) */
  endpointId: number;
  on: boolean;
  /**
   * 클라이언트 전용 임시 플래그. 사용자가 누른 값을 서버가 아직 반영하지 못해
   * 낙관값을 유지 중일 때 true. (서버는 설정하지 않음)
   */
  pending?: boolean;
};

export type DeviceDto = {
  nodeId: string;
  /** 표시 이름: 사용자 지정(customName)이 있으면 그것, 없으면 matterName */
  name: string;
  /** Matter가 제공하는 기본 이름 (초기화 시 사용) */
  matterName: string;
  /** DB에 저장된 사용자 지정 이름. 없으면 null */
  customName: string | null;
  vendorName?: string;
  productName?: string;
  online: boolean;
  endpoints: DeviceEndpointDto[];
  /** OnOff cluster가 없는 기기는 null */
  power: DevicePowerDto | null;
};
