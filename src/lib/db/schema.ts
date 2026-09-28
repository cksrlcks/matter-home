import {
  bigserial,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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
