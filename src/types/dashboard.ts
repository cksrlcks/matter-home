// 메인 화면(대시보드) 구성 DTO. 클라이언트/서버 공용. (server-only import 금지)

export const DEVICE_SOURCES = ["matter", "smartthings"] as const;
export type DeviceSource = (typeof DEVICE_SOURCES)[number];

export type DashboardGroupDto = {
  id: number;
  name: string;
};

// 메인 화면의 타일 하나.
export type DashboardItemDto = {
  source: DeviceSource;
  deviceId: string;
  /**
   * null이면 기기 전체가 한 타일(다구 스위치는 "묶어서 보기").
   * 숫자면 다구 스위치의 구(endpoint) 하나가 독립 타일("풀어서 보기").
   */
  endpointId: number | null;
  /** 그룹 미지정이면 null */
  groupId: number | null;
};

export type DashboardDto = {
  /** 화면 순서대로 */
  groups: DashboardGroupDto[];
  /** 화면 순서대로 (그룹을 가로질러 하나의 순서) */
  items: DashboardItemDto[];
};
