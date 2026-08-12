ALTER TABLE "users"
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "customer_email_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "otp_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "request_window_start" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_email_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_email_verifications_user_id_key"
  ON "customer_email_verifications"("user_id");

CREATE INDEX "customer_email_verifications_expires_at_idx"
  ON "customer_email_verifications"("expires_at");

CREATE INDEX "customer_email_verifications_request_window_idx"
  ON "customer_email_verifications"("request_window_start");

ALTER TABLE "customer_email_verifications"
  ADD CONSTRAINT "customer_email_verifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;