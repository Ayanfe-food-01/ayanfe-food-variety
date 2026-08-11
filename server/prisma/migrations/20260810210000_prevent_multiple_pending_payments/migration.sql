-- Prevent concurrent public submissions from creating multiple pending proofs
-- for the same order. Rejected proofs can still be resubmitted.
CREATE UNIQUE INDEX "payment_submissions_one_pending_per_order_idx"
ON "payment_submissions" ("order_id")
WHERE "status" = 'PENDING';