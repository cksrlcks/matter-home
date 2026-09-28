CREATE TABLE "energy_samples" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"node_id" text NOT NULL,
	"cumulative_kwh" double precision NOT NULL,
	"active_power_w" double precision,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "energy_samples_node_recorded_idx" ON "energy_samples" USING btree ("node_id","recorded_at");--> statement-breakpoint
CREATE INDEX "energy_samples_recorded_idx" ON "energy_samples" USING btree ("recorded_at");