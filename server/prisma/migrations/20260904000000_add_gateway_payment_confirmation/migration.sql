-- Phase 4: record when a gateway payment is confirmed on the order, and keep
-- the source cart rows of a gateway order so they can be released only after
-- the payment is successfully verified (not when Paystack simply opens).
ALTER TABLE "orders"
  ADD COLUMN "payment_confirmed_at" TIMESTAMPTZ(6),
  ADD COLUMN "payment_cart_item_ids" JSONB;