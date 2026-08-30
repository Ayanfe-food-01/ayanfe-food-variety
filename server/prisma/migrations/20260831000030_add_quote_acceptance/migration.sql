-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "accepted_at" TIMESTAMPTZ(6);
ALTER TABLE "quote_requests" ADD COLUMN     "rejected_at" TIMESTAMPTZ(6);
ALTER TABLE "quote_requests" ADD COLUMN     "rejection_reason" VARCHAR(500);


-- A rejection reason, when present, must be meaningful text.
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_rejection_reason_check" CHECK ("rejection_reason" IS NULL OR char_length(btrim("rejection_reason")) > 0);