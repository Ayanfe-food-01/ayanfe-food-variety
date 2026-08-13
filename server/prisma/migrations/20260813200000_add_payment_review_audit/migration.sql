CREATE TYPE "PaymentRejectionReason" AS ENUM (
  'AMOUNT_MISMATCH',
  'PROOF_UNCLEAR',
  'TRANSACTION_UNVERIFIED',
  'WRONG_ACCOUNT',
  'DUPLICATE_PROOF',
  'OTHER'
);

CREATE TYPE "PaymentAuditAction" AS ENUM (
  'PROOF_SUBMITTED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_REJECTED'
);

ALTER TABLE "payment_submissions"
  ADD COLUMN "rejection_reason" "PaymentRejectionReason";

CREATE TABLE "payment_audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_submission_id" UUID NOT NULL,
  "action" "PaymentAuditAction" NOT NULL,
  "performed_by_id" UUID,
  "note" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_audit_events_submission_created_idx"
  ON "payment_audit_events"("payment_submission_id", "created_at");

CREATE INDEX "payment_audit_events_performed_by_idx"
  ON "payment_audit_events"("performed_by_id");

ALTER TABLE "payment_audit_events"
  ADD CONSTRAINT "payment_audit_events_payment_submission_id_fkey"
  FOREIGN KEY ("payment_submission_id") REFERENCES "payment_submissions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "payment_audit_events"
  ADD CONSTRAINT "payment_audit_events_performed_by_id_fkey"
  FOREIGN KEY ("performed_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;