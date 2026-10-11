import {
  bigserial,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { DeviceSource } from "@/types/dashboard";

// Matter node별 사용자 지정 이름. node_id(Matter node id 문자열)당 한 개.
export const deviceNames = pgTable("device_names", {
  nodeId: text("node_id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type DeviceNameRow = typeof deviceNames.$inferSelect;

// 다구 스위치처럼 한 node에 On/Off endpoint가 여러 개일 때, endpoint(구)별 사용자 지정 이름.
export const deviceEndpointNames = pgTable(
  "device_endpoint_names",
  {
    nodeId: text("node_id").notNull(),
    endpointId: integer("endpoint_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.nodeId, table.endpointId] })],
);

// SmartThings 기기별 앱 내 표시 이름. SmartThings 쪽 label은 건드리지 않는다.
export const smartthingsDeviceNames = pgTable("smartthings_device_names", {
  deviceId: text("device_id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 플러그 누적 전력량 스냅샷. 기간 사용량은 연속 샘플 간 차이의 합으로 계산한다.
export const energySamples = pgTable(
  "energy_samples",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nodeId: text("node_id").notNull(),
    /** 플러그가 보고한 누적 소비전력량 (kWh) */
    cumulativeKwh: doublePrecision("cumulative_kwh").notNull(),
    /** 샘플 시점의 순간 소비전력 (W) */
    activePowerW: doublePrecision("active_power_w"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("energy_samples_node_recorded_idx").on(
      table.nodeId,
      table.recordedAt,
    ),
    index("energy_samples_recorded_idx").on(table.recordedAt),
  ],
);

export type EnergySampleRow = typeof energySamples.$inferSelect;

// 메인 화면 기기 그룹. 집 전체가 공유한다(사용자별 구분 없음).
export const dashboardGroups = pgTable("dashboard_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** 메인 화면의 그룹 순서 (오름차순) */
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 기기 전체를 한 타일로 올린 행의 endpoint_id. (PK에 null을 쓸 수 없어 sentinel을 둔다)
export const WHOLE_DEVICE_ENDPOINT = -1;

// 메인 화면의 타일. 기기 전체(endpoint_id = -1) 또는 다구 스위치의 구(endpoint) 하나.
// 한 기기는 "전체 한 줄"(묶어서 보기) 이거나 "구별 여러 줄"(풀어서 보기) 중 하나다.
// 그룹이 삭제되면 타일은 남고 그룹만 해제된다.
export const dashboardItems = pgTable(
  "dashboard_items",
  {
    source: text("source").$type<DeviceSource>().notNull(),
    /** Matter node id 또는 SmartThings deviceId */
    deviceId: text("device_id").notNull(),
    endpointId: integer("endpoint_id").notNull().default(WHOLE_DEVICE_ENDPOINT),
    /** 메인 화면 전체에서의 타일 순서 (오름차순) */
    position: integer("position").notNull().default(0),
    groupId: integer("group_id").references(() => dashboardGroups.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.source, table.deviceId, table.endpointId] }),
  ],
);

// SmartThings OAuth 토큰. 집 전체가 계정 하나를 쓰므로 id=1 한 줄만 둔다.
export const smartthingsTokens = pgTable("smartthings_tokens", {
  id: integer("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
