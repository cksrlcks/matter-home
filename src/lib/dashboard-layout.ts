// 메인 화면 타일 배열을 다루는 순수 함수. 클라이언트가 새 배열을 만들어 통째로 저장한다.
// (server-only import 금지)

import type { DashboardItemDto, DeviceSource } from "@/types/dashboard";

export type DeviceKey = { source: DeviceSource; deviceId: string };

export const tileKey = (item: Pick<DashboardItemDto, "source" | "deviceId" | "endpointId">) =>
  `${item.source}:${item.deviceId}:${item.endpointId ?? "all"}`;

export const sameDevice = (a: DeviceKey, b: DeviceKey) =>
  a.source === b.source && a.deviceId === b.deviceId;

export const deviceTiles = (items: DashboardItemDto[], device: DeviceKey) =>
  items.filter((item) => sameDevice(item, device));

// 구가 여러 개인 기기는 구별 타일로(풀어서), 아니면 기기 전체 한 타일로 만든다.
function tilesFor(
  device: DeviceKey,
  endpointIds: number[],
  groupId: number | null,
): DashboardItemDto[] {
  if (endpointIds.length > 1) {
    return endpointIds.map((endpointId) => ({ ...device, endpointId, groupId }));
  }
  return [{ ...device, endpointId: null, groupId }];
}

// 메인에 추가하거나, 이미 있으면 그 기기의 타일을 모두 해당 그룹으로 옮긴다.
// 새로 추가하는 다구 기기는 풀어서(구별 타일로) 맨 뒤에 붙인다.
export function setDeviceGroup(
  items: DashboardItemDto[],
  device: DeviceKey,
  groupId: number | null,
  endpointIds: number[] = [],
): DashboardItemDto[] {
  if (items.some((item) => sameDevice(item, device))) {
    return items.map((item) => (sameDevice(item, device) ? { ...item, groupId } : item));
  }
  return [...items, ...tilesFor(device, endpointIds, groupId)];
}

export function removeDevice(
  items: DashboardItemDto[],
  device: DeviceKey,
): DashboardItemDto[] {
  return items.filter((item) => !sameDevice(item, device));
}

export function removeTile(items: DashboardItemDto[], key: string): DashboardItemDto[] {
  return items.filter((item) => tileKey(item) !== key);
}

// 묶인 기기 타일을 구별 타일로 바꾼다. 원래 자리·그룹을 물려받는다.
export function splitDevice(
  items: DashboardItemDto[],
  device: DeviceKey,
  endpointIds: number[],
): DashboardItemDto[] {
  return items.flatMap((item) =>
    sameDevice(item, device) && item.endpointId === null
      ? endpointIds.map((endpointId) => ({ ...item, endpointId }))
      : [item],
  );
}

// 구(endpoint) 하나만 홈에 올리거나 그룹을 바꾼다.
// 기기가 묶여 있으면 구 하나만 따로 다룰 수 없으므로 먼저 구별 타일로 푼다.
export function setEndpointGroup(
  items: DashboardItemDto[],
  device: DeviceKey,
  endpointId: number,
  groupId: number | null,
  endpointIds: number[],
): DashboardItemDto[] {
  const split = splitDevice(items, device, endpointIds);
  const isTarget = (item: DashboardItemDto) =>
    sameDevice(item, device) && item.endpointId === endpointId;
  if (split.some(isTarget)) {
    return split.map((item) => (isTarget(item) ? { ...item, groupId } : item));
  }
  return [...split, { ...device, endpointId, groupId }];
}

// 구(endpoint) 하나만 홈에서 뺀다. 묶여 있었다면 나머지 구는 구별 타일로 남는다.
export function removeEndpoint(
  items: DashboardItemDto[],
  device: DeviceKey,
  endpointId: number,
  endpointIds: number[],
): DashboardItemDto[] {
  return splitDevice(items, device, endpointIds).filter(
    (item) => !(sameDevice(item, device) && item.endpointId === endpointId),
  );
}

// 구별 타일을 기기 전체 한 타일로 합친다. 첫 번째 구 타일의 자리·그룹에 놓는다.
export function bundleDevice(
  items: DashboardItemDto[],
  device: DeviceKey,
): DashboardItemDto[] {
  let placed = false;
  return items.flatMap((item) => {
    if (!sameDevice(item, device)) return [item];
    if (placed) return [];
    placed = true;
    return [{ ...item, endpointId: null }];
  });
}
