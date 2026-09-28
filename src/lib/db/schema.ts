import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
