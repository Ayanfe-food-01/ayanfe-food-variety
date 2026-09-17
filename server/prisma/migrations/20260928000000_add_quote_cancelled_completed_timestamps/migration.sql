-- Record when an admin cancels a quote request and when it is completed,
-- so the lifecycle of the request is fully timestamped.
ALTER TABLE "quote_requests" ADD COLUMN "cancelled_at" TIMESTAMPTZ(6);
ALTER TABLE "quote_requests" ADD COLUMN "cancelled_reason" VARCHAR(500);
ALTER TABLE "quote_requests" ADD COLUMN "completed_at" TIMESTAMPTZ(6);