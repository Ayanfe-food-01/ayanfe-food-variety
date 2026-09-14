-- Lifecycle status for customer-submitted contact form messages.
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'RESOLVED');

-- Admin bell notifications gain a type for new contact messages.
ALTER TYPE "AdminNotificationType" ADD VALUE 'NEW_CONTACT_MESSAGE';

-- Customer-submitted contact form messages. request_key is generated per form
-- load so a resubmit resolves to the same row instead of creating a duplicate;
-- user_id links a signed-in submitter when available.
CREATE TABLE "contact_messages" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_key" VARCHAR(64) NOT NULL,
    "user_id"     UUID,
    "name"        VARCHAR(180) NOT NULL,
    "email"       VARCHAR(255) NOT NULL,
    "subject"     VARCHAR(180) NOT NULL,
    "message"     TEXT NOT NULL,
    "status"      "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contact_messages_request_key_key"
  ON "contact_messages"("request_key");

CREATE INDEX "contact_messages_status_created_idx"
  ON "contact_messages"("status", "created_at" DESC);

CREATE INDEX "contact_messages_user_id_idx"
  ON "contact_messages"("user_id");

ALTER TABLE "contact_messages"
  ADD CONSTRAINT "contact_messages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;