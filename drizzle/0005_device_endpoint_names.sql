CREATE TABLE "device_endpoint_names" (
	"node_id" text NOT NULL,
	"endpoint_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_endpoint_names_node_id_endpoint_id_pk" PRIMARY KEY("node_id","endpoint_id")
);
