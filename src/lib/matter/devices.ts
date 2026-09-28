import "server-only";

import { isTestNodeId, type MatterNode } from "@matter-server/ws-client";

import type {
  DeviceDto,
  DeviceEndpointDto,
  DevicePowerDto,
} from "@/types/matter";

import { deleteDeviceName, getDeviceNameMap } from "@/lib/db/device-names";

import { getMatterClient } from "./client";
import { deviceTypeName } from "./device-types";

// Matter attribute는 "<endpoint>/<cluster>/<attribute>" key로 저장된다.
const ONOFF_CLUSTER_ID = 6;
const ONOFF_ATTR_ID = 0; // OnOff.OnOff (boolean)
const DESCRIPTOR_CLUSTER_ID = 29; // 0x1D
const DEVICE_TYPE_LIST_ATTR_ID = 0; // Descriptor.DeviceTypeList

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
