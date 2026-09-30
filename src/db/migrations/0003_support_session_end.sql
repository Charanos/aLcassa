CREATE TYPE "public"."support_end_reason" AS ENUM('operator', 'colleague', 'customer', 'expired', 'superseded', 'break_glass');--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "end_reason" "support_end_reason";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ended_by" uuid;--> statement-breakpoint
-- Support sessions already ended say how, from the reason the code wrote.
-- Break glass revoked with no reason at all, so a null reason is break glass;
-- anything else unrecognised was the operator's own exit.
UPDATE "sessions" SET "end_reason" = CASE
  WHEN "revoked_reason" LIKE 'superseded%' THEN 'superseded'::support_end_reason
  WHEN "revoked_reason" IS NULL OR "revoked_reason" LIKE '%locked%' THEN 'break_glass'::support_end_reason
  ELSE 'operator'::support_end_reason
END
WHERE "kind" = 'support' AND "revoked_at" IS NOT NULL AND "end_reason" IS NULL;
