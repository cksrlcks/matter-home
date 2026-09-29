CREATE TABLE "dashboard_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_items" (
	"source" text NOT NULL,
	"device_id" text NOT NULL,
	"group_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_items_source_device_id_pk" PRIMARY KEY("source","device_id")
);
--> statement-breakpoint
ALTER TABLE "dashboard_items" ADD CONSTRAINT "dashboard_items_group_id_dashboard_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."dashboard_groups"("id") ON DELETE set null ON UPDATE no action;