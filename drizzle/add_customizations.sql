-- Incremental: buyer customizations (Pillar 1 v1.0 §4.5).
-- Safe on existing DBs: use IF NOT EXISTS.
-- Alternative: from app dir run `npm run db:push` (syncs full Drizzle schema).

CREATE TABLE IF NOT EXISTS "customizations" (
	"customization_id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"template_id" text NOT NULL,
	"design_data" jsonb NOT NULL,
	"dpi_check_result" jsonb NOT NULL,
	"warnings" jsonb NOT NULL,
	"preview_url" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "customizations_product_id_idx" ON "customizations" ("product_id");
CREATE INDEX IF NOT EXISTS "customizations_created_at_idx" ON "customizations" ("created_at");
