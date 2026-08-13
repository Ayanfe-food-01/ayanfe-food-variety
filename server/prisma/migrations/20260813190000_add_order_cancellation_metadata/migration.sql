ALTER TABLE "orders"
  ADD COLUMN "cancellation_reason" VARCHAR(500),
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(6);