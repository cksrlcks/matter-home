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

/**
 * 전력 측정값. ElectricalPowerMeasurement(0x90) / ElectricalEnergyMeasurement(0x91)
 * cluster에서 읽는다. 기기가 해당 attribute를 제공하지 않으면 null.
 */
export type DeviceEnergyDto = {
  /** 측정 cluster가 붙어 있는 endpoint (GRILLPLATS는 2) */
  endpointId: number;
  /** 현재 소비전력 (W) */
  activePowerW: number | null;
  /** 전압 (V) */
  voltageV: number | null;
  /** 전류 (A) */
  currentA: number | null;
  /** 누적 소비전력량 (kWh) */
  cumulativeKwh: number | null;
};

export type DeviceEnergyUsageDto = {
  nodeId: string;
  todayKwh: number;
  monthKwh: number;
};

export type DailyEnergyDto = {
  /** YYYY-MM-DD (한국 시간 기준) */
  date: string;
  kwh: number;
};

/** DB에 쌓인 누적 전력량 샘플로 계산한 기간별 사용량 */
export type EnergyUsageDto = {
  timezone: string;
  /** 요금 추정 단가 (원/kWh) */
  pricePerKwh: number;
  /** 첫 샘플 시각 (ISO). 기록이 없으면 null */
  since: string | null;
  todayKwh: number;
  monthKwh: number;
  /** 지금까지의 사용 속도로 추정한 이번 달 사용량. 기록이 너무 짧으면 null */
  projectedMonthKwh: number | null;
  devices: DeviceEnergyUsageDto[];
  /** 최근 30일 일별 합계 (오래된 순, 기록 없는 날은 0) */
  daily: DailyEnergyDto[];
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
  /** 전력 측정을 지원하지 않는 기기는 null */
  energy: DeviceEnergyDto | null;
};

/** discover로 찾은, 아직 fabric에 등록되지 않은 commissionable 기기 */
export type CommissionableDeviceDto = {
  /** 목록 key용 식별자 (instance name 또는 discriminator 기반) */
  id: string;
  /** 표시 이름: device_name → 기기 타입명 → vendor/product 순으로 결정 */
  name: string;
  vendorName?: string;
  vendorId?: number;
  productId?: number;
  deviceType?: string;
  /** 12bit long discriminator. 페어링 코드와 대조할 때 참고용 */
  discriminator?: number;
  /** 0=광고만, 1=basic window, 2=enhanced window */
  commissioningMode?: number;
  /** 발견 경로. 주소가 없으면 BLE 광고로 발견된 것으로 본다 */
  transport: "ble" | "network";
  addresses: string[];
};
