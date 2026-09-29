// 메인 화면(대시보드) 구성 DTO. 클라이언트/서버 공용. (server-only import 금지)

export const DEVICE_SOURCES = ["matter", "smartthings"] as const;
export type DeviceSource = (typeof DEVICE_SOURCES)[number];

export type DashboardGroupDto = {
  id: number;
  name: string;
};

export type DashboardItemDto = {
  source: DeviceSource;
  deviceId: string;
  /** 그룹 미지정이면 null */
  groupId: number | null;
};

export type DashboardDto = {
  /** 생성 순 */
  groups: DashboardGroupDto[];
  /** 추가된 순 */
  items: DashboardItemDto[];
};
