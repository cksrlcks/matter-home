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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 메인 화면에 표시할 기기. 그룹이 삭제되면 기기는 남고 그룹만 해제된다.
export const dashboardItems = pgTable(
  "dashboard_items",
  {
    source: text("source").$type<DeviceSource>().notNull(),
    /** Matter node id 또는 SmartThings deviceId */
    deviceId: text("device_id").notNull(),
    groupId: integer("group_id").references(() => dashboardGroups.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.source, table.deviceId] })],
);
