ALTER TABLE "dashboard_groups" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard_items" ADD COLUMN "endpoint_id" integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard_items" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard_items" DROP CONSTRAINT "dashboard_items_source_device_id_pk";--> statement-breakpoint
ALTER TABLE "dashboard_items" ADD CONSTRAINT "dashboard_items_source_device_id_endpoint_id_pk" PRIMARY KEY("source","device_id","endpoint_id");--> statement-breakpoint
UPDATE "dashboard_groups" AS g SET "position" = o.rn FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS rn FROM "dashboard_groups") AS o WHERE g."id" = o."id";--> statement-breakpoint
UPDATE "dashboard_items" AS i SET "position" = o.rn FROM (SELECT "source", "device_id", row_number() OVER (ORDER BY "created_at") AS rn FROM "dashboard_items") AS o WHERE i."source" = o."source" AND i."device_id" = o."device_id";
