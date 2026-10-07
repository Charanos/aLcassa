ALTER TABLE "platform_admins" ADD COLUMN "notifications_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "contract_amount" bigint;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "past_due_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_contract_amount_check" CHECK ("contract_amount" IS NULL OR "contract_amount" >= 0);--> statement-breakpoint
-- A past-due subscription says since when. The period start is the best
-- record there is for the ones that already exist.
UPDATE "subscriptions" SET "past_due_since" = "current_period_start"
WHERE "status" = 'past_due' AND "past_due_since" IS NULL;--> statement-breakpoint
-- Self-registered workspaces were created with no subscription at all, so no
-- screen could count them as trials. Give each the trial sign-up now starts:
-- Pro, fourteen days from the day the workspace was created.
INSERT INTO "subscriptions" ("tenant_id", "plan_id", "status", "current_period_start", "current_period_end", "trial_ends_at")
SELECT t."id", p."id", 'trialing', t."created_at", t."created_at" + interval '14 days', t."created_at" + interval '14 days'
FROM "tenants" t
JOIN "plans" p ON p."code" = 'pro'
WHERE t."deleted_at" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "subscriptions" s WHERE s."tenant_id" = t."id");
