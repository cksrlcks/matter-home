import "server-only";

import {
  isTestNodeId,
  type CommissionableNodeData,
  type MatterNode,
} from "@matter-server/ws-client";

import type {
  CommissionableDeviceDto,
  DeviceDto,
  DeviceEndpointDto,
  DeviceEnergyDto,
  DevicePowerDto,
} from "@/types/matter";

import { deleteDeviceName, getDeviceNameMap } from "@/lib/db/device-names";

import { getMatterClient } from "./client";
import { deviceTypeName } from "./device-types";
import { vendorName } from "./vendors";

// Matter attribute는 "<endpoint>/<cluster>/<attribute>" key로 저장된다.
const ONOFF_CLUSTER_ID = 6;
const ONOFF_ATTR_ID = 0; // OnOff.OnOff (boolean)
const DESCRIPTOR_CLUSTER_ID = 29; // 0x1D
const DEVICE_TYPE_LIST_ATTR_ID = 0; // Descriptor.DeviceTypeList
const POWER_MEASUREMENT_CLUSTER_ID = 144; // 0x90 ElectricalPowerMeasurement
const VOLTAGE_ATTR_ID = 4; // Voltage (mV)
const ACTIVE_CURRENT_ATTR_ID = 5; // ActiveCurrent (mA)
const ACTIVE_POWER_ATTR_ID = 8; // ActivePower (mW)
const ENERGY_MEASUREMENT_CLUSTER_ID = 145; // 0x91 ElectricalEnergyMeasurement
const CUMULATIVE_IMPORTED_ATTR_ID = 1; // CumulativeEnergyImported (EnergyMeasurementStruct)

function endpointIds(node: MatterNode): number[] {
  const ids = new Set<number>();
  for (const key of Object.keys(node.attributes)) {
    const endpoint = Number(key.split("/")[0]);
    if (Number.isInteger(endpoint)) ids.add(endpoint);
  }
  return [...ids].sort((a, b) => a - b);
}

function endpointDeviceType(
  node: MatterNode,
  endpointId: number,
): string | undefined {
  const list =
    node.attributes[
      `${endpointId}/${DESCRIPTOR_CLUSTER_ID}/${DEVICE_TYPE_LIST_ATTR_ID}`
    ];
  if (!Array.isArray(list) || list.length === 0) return undefined;

  // 엔트리는 { deviceType, revision } 또는 wire상 { "0": id, "1": rev } 형태일 수 있다.
  const first = list[0] as Record<string, unknown> | undefined;
  const typeId =
    typeof first?.deviceType === "number"
      ? first.deviceType
      : typeof first?.["0"] === "number"
        ? (first["0"] as number)
        : undefined;

  return typeId !== undefined ? deviceTypeName(typeId) : undefined;
}

function onOffEndpoints(node: MatterNode): number[] {
  const ids: number[] = [];
  for (const key of Object.keys(node.attributes)) {
    const [endpoint, cluster, attribute] = key.split("/").map(Number);
    if (cluster === ONOFF_CLUSTER_ID && attribute === ONOFF_ATTR_ID) {
      ids.push(endpoint);
    }
  }
  return ids.sort((a, b) => a - b);
}

// 제어 대상 endpoint를 고른다. GRILLPLATS 기준 endpoint 1을 우선한다.
function pickOnOffEndpoint(node: MatterNode): number | null {
  const ids = onOffEndpoints(node);
  if (ids.length === 0) return null;
  return ids.includes(1) ? 1 : ids[0];
}

function readPower(node: MatterNode): DevicePowerDto | null {
  const endpointId = pickOnOffEndpoint(node);
  if (endpointId === null) return null;
  const raw =
    node.attributes[`${endpointId}/${ONOFF_CLUSTER_ID}/${ONOFF_ATTR_ID}`];
  return { endpointId, on: raw === true };
}

// int64 attribute는 number / bigint / 문자열 중 하나로 올 수 있다.
function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function scaled(value: unknown, divisor: number): number | null {
  const n = toNumber(value);
  return n === null ? null : n / divisor;
}

function findClusterEndpoint(
  node: MatterNode,
  clusterId: number,
): number | null {
  const ids = new Set<number>();
  for (const key of Object.keys(node.attributes)) {
    const [endpoint, cluster] = key.split("/").map(Number);
    if (cluster === clusterId) ids.add(endpoint);
  }
  if (ids.size === 0) return null;
  return Math.min(...ids);
}

function readEnergy(node: MatterNode): DeviceEnergyDto | null {
  const powerEp = findClusterEndpoint(node, POWER_MEASUREMENT_CLUSTER_ID);
  const energyEp = findClusterEndpoint(node, ENERGY_MEASUREMENT_CLUSTER_ID);
  if (powerEp === null && energyEp === null) return null;

  const attr = (endpoint: number | null, cluster: number, attribute: number) =>
    endpoint === null
      ? undefined
      : node.attributes[`${endpoint}/${cluster}/${attribute}`];

  // EnergyMeasurementStruct: { energy } 또는 wire상 { "0": energy } (단위 mWh)
  const imported = attr(
    energyEp,
    ENERGY_MEASUREMENT_CLUSTER_ID,
    CUMULATIVE_IMPORTED_ATTR_ID,
  ) as Record<string, unknown> | null | undefined;
  const importedMwh = imported ? (imported.energy ?? imported["0"]) : undefined;

  return {
    endpointId: (powerEp ?? energyEp) as number,
    activePowerW: scaled(
      attr(powerEp, POWER_MEASUREMENT_CLUSTER_ID, ACTIVE_POWER_ATTR_ID),
      1000,
    ),
    voltageV: scaled(
      attr(powerEp, POWER_MEASUREMENT_CLUSTER_ID, VOLTAGE_ATTR_ID),
      1000,
    ),
    currentA: scaled(
      attr(powerEp, POWER_MEASUREMENT_CLUSTER_ID, ACTIVE_CURRENT_ATTR_ID),
      1000,
    ),
    cumulativeKwh: scaled(importedMwh, 1_000_000),
  };
}

function toEndpointDtos(node: MatterNode): DeviceEndpointDto[] {
  return endpointIds(node).map((id) => ({
    id,
    deviceType: endpointDeviceType(node, id),
  }));
}

function toDeviceDto(
  node: MatterNode,
  nameOverrides: Map<string, string>,
): DeviceDto {
  const nodeId = String(node.node_id);
  const matterName = node.nodeLabel || node.productName || `Node ${nodeId}`;
  const customName = nameOverrides.get(nodeId) ?? null;
  return {
    nodeId,
    name: customName ?? matterName,
    matterName,
    customName,
    vendorName: node.vendorName || undefined,
    productName: node.productName || undefined,
    online: node.available,
    endpoints: toEndpointDtos(node),
    power: readPower(node),
    energy: readEnergy(node),
  };
}

export async function getDevices(): Promise<DeviceDto[]> {
  const client = await getMatterClient();
  // startListening() 이후 client.nodes는 node_*/attribute_updated 이벤트로 실시간
  // 갱신되는 로컬 캐시다. getNodes()로 매번 get_nodes를 왕복하지 않고 캐시를 읽는다.
  const nodes = Object.values(client.nodes);

  // 커스텀 이름은 부가 정보. DB가 잠깐 죽어도 기기 목록은 계속 반환한다.
  let nameOverrides = new Map<string, string>();
  try {
    nameOverrides = await getDeviceNameMap();
  } catch (error) {
    console.error("[db] 커스텀 이름 조회 실패:", error);
  }

  return nodes
    .filter((node) => !isTestNodeId(node.node_id))
    .map((node) => toDeviceDto(node, nameOverrides));
}

export type EnergyReading = {
  nodeId: string;
  cumulativeKwh: number;
  activePowerW: number | null;
};

// 샘플러용: 온라인 + 누적 전력량을 보고하는 노드의 현재 값.
// (오프라인 노드의 캐시값은 오래된 값이라 기록하지 않는다)
export async function getEnergyReadings(): Promise<EnergyReading[]> {
  const client = await getMatterClient();
  const readings: EnergyReading[] = [];
  for (const node of Object.values(client.nodes)) {
    if (isTestNodeId(node.node_id) || !node.available) continue;
    const energy = readEnergy(node);
    if (energy?.cumulativeKwh == null) continue;
    readings.push({
      nodeId: String(node.node_id),
      cumulativeKwh: energy.cumulativeKwh,
      activePowerW: energy.activePowerW,
    });
  }
  return readings;
}

async function findNode(nodeId: string): Promise<MatterNode> {
  const client = await getMatterClient();
  const cached = client.nodes[nodeId];
  if (cached) return cached;

  const nodes = await client.getNodes();
  const node = nodes.find((n) => String(n.node_id) === nodeId);
  if (!node) throw new Error(`기기(${nodeId})를 찾을 수 없습니다.`);
  return node;
}

// Manual pairing code(숫자+구분자)와 QR payload(MT:...) 둘 다 지원한다.
function normalizeCommissionCode(raw: string): string {
  const trimmed = raw.trim();
  // QR payload는 그대로 사용한다. (예: "MT:...")
  if (/^MT:/i.test(trimmed)) return trimmed.toUpperCase();
  // Manual pairing code는 공백/하이픈 등 구분자를 제거해 숫자만 남긴다.
  return trimmed.replace(/[\s-]/g, "");
}

// commissioning은 동시에 하나만 가능하다. BLE attempt가 병렬로 겹치면 서버가
// "Failed parallel commissioning attempt: [ble]"로 실패한다.
// dev HMR에서도 유지되도록 플래그를 globalThis에 둔다.
const globalForCommission = globalThis as unknown as {
  __commissioning?: boolean;
};

export class CommissioningInProgressError extends Error {
  constructor() {
    super("다른 기기를 추가하는 중입니다. 완료 후 다시 시도해주세요.");
    this.name = "CommissioningInProgressError";
  }
}

// 새 Matter 기기 commissioning.
// Raspberry Pi의 BLE로 페어링 후 저장된 Thread credential(default)로 네트워크에 조인한다.
// BLE + Thread 조인까지 수 분 걸릴 수 있다. (client 기본 timeout 5분)
export async function commissionDevice(rawCode: string): Promise<DeviceDto> {
  // 이미 진행 중이면 새 attempt를 시작하지 않는다. (BLE 병렬 충돌 방지)
  if (globalForCommission.__commissioning) {
    throw new CommissioningInProgressError();
  }
  globalForCommission.__commissioning = true;

  try {
    const code = normalizeCommissionCode(rawCode);
    const client = await getMatterClient();

    // networkOnly=false: 아직 Thread망에 없는 새 기기를 BLE로 온보딩한다.
    // (기본값 true는 이미 네트워크에 올라온 기기만 찾으므로 신규 페어링이 안 된다.)
    const node = await client.commissionWithCode(code, false);

    // 커스텀 이름은 부가 정보. DB가 잠깐 죽어도 추가된 기기는 반환한다.
    let nameOverrides = new Map<string, string>();
    try {
      nameOverrides = await getDeviceNameMap();
    } catch (error) {
      console.error("[db] 커스텀 이름 조회 실패:", error);
    }

    return toDeviceDto(node, nameOverrides);
  } finally {
    globalForCommission.__commissioning = false;
  }
}

// discover는 BLE 스캔 + mDNS 조회를 모아서 반환하므로 수 초~수십 초 걸린다.
const DISCOVER_TIMEOUT_MS = 60_000;

function commissionableName(node: CommissionableNodeData): string {
  if (node.device_name) return node.device_name;
  const typeName =
    node.device_type !== undefined ? deviceTypeName(node.device_type) : undefined;
  const vendor =
    node.vendor_id !== undefined ? vendorName(node.vendor_id) : undefined;
  if (vendor && typeName) return `${vendor} ${typeName}`;
  if (typeName) return typeName;
  if (vendor) return `${vendor} 기기`;
  return "알 수 없는 Matter 기기";
}

function toCommissionableDto(
  node: CommissionableNodeData,
): CommissionableDeviceDto {
  const addresses = node.addresses ?? [];
  const id =
    node.instance_name ??
    `${node.vendor_id ?? "?"}-${node.product_id ?? "?"}-${node.long_discriminator ?? "?"}`;
  return {
    id,
    name: commissionableName(node),
    vendorName:
      node.vendor_id !== undefined ? vendorName(node.vendor_id) : undefined,
    vendorId: node.vendor_id,
    productId: node.product_id,
    deviceType:
      node.device_type !== undefined
        ? deviceTypeName(node.device_type)
        : undefined,
    discriminator: node.long_discriminator,
    commissioningMode: node.commissioning_mode,
    transport: addresses.length > 0 ? "network" : "ble",
    addresses,
  };
}

// 아직 등록되지 않은 commissionable 기기 검색 (Matter BLE 광고 fff6 / _matterc._udp mDNS).
// "페어링 모드인 모든 BLE 기기"가 아니라 Matter commissioning 광고를 내는 기기만 찾는다.
// 실제 등록에는 여전히 setup code(QR/Manual)가 필요하다.
export async function discoverCommissionableDevices(): Promise<
  CommissionableDeviceDto[]
> {
  // commissioning 중에는 BLE 라디오를 쓰고 있으므로 스캔을 겹치지 않는다.
  if (globalForCommission.__commissioning) {
    throw new CommissioningInProgressError();
  }

  const client = await getMatterClient();
  const nodes = await client.discoverCommissionableNodes(DISCOVER_TIMEOUT_MS);

  // BLE와 mDNS 양쪽으로 같은 기기가 잡힐 수 있어 id 기준으로 중복 제거한다.
  // 주소 정보가 있는(network) 쪽을 우선한다.
  const byId = new Map<string, CommissionableDeviceDto>();
  for (const node of nodes) {
    const dto = toCommissionableDto(node);
    const existing = byId.get(dto.id);
    if (!existing || (existing.transport === "ble" && dto.transport === "network")) {
      byId.set(dto.id, dto);
    }
  }
  return [...byId.values()];
}

// fabric에서 노드 제거 (decommission). 사용자 지정 이름도 함께 정리한다.
export async function removeDevice(nodeId: string): Promise<void> {
  const client = await getMatterClient();
  const node = await findNode(nodeId);

  // node.node_id는 number|bigint 원본을 그대로 넘긴다.
  await client.removeNode(node.node_id);

  // 이름 삭제는 부가 작업. 실패해도 기기 제거 자체는 성공으로 취급한다.
  try {
    await deleteDeviceName(nodeId);
  } catch (error) {
    console.error("[db] 커스텀 이름 삭제 실패:", error);
  }
}

export async function setDevicePower(
  nodeId: string,
  on: boolean,
): Promise<DevicePowerDto> {
  const client = await getMatterClient();
  const node = await findNode(nodeId);

  const endpointId = pickOnOffEndpoint(node);
  if (endpointId === null) {
    throw new Error(`기기(${nodeId})는 On/Off를 지원하지 않습니다.`);
  }

  // OnOff cluster(6)의 on/off 커맨드. node.node_id는 number|bigint 원본을 그대로 넘긴다.
  await client.deviceCommand(
    node.node_id,
    endpointId,
    ONOFF_CLUSTER_ID,
    on ? "on" : "off",
  );

  return { endpointId, on };
}
