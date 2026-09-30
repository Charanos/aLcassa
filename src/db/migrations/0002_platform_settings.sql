CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton" boolean DEFAULT true NOT NULL,
	"platform_name" text NOT NULL,
	"support_email" text NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_singleton_check" CHECK ("platform_settings"."singleton")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_settings_singleton_idx" ON "platform_settings" USING btree ("singleton");--> statement-breakpoint
-- The one row. Written here, by the migration, so every database that has the
-- table has the row: nothing in the application inserts it, and no policy
-- would allow the application role to. `on conflict do nothing` keeps a re-run
-- against a database that already holds it harmless.
INSERT INTO "platform_settings" ("platform_name", "support_email") VALUES ('aLcassa', 'support@alcassa.co.ke') ON CONFLICT DO NOTHING;
