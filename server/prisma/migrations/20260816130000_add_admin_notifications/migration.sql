CREATE TYPE "AdminNotificationType" AS ENUM (
    'NEW_ORDER',
    'PAYMENT_PROOF_SUBMITTED',
    'PAYMENT_CONFIRMED',
    'CUSTOMER_ORDER_CANCELLED',
    'LOW_STOCK'
);

CREATE TABLE "admin_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "AdminNotificationType" NOT NULL,
    "event_key" VARCHAR(255) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "href" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_notification_reads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notification_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_notifications_event_key_key"
    ON "admin_notifications"("event_key");

CREATE INDEX "admin_notifications_created_at_idx"
    ON "admin_notifications"("created_at");

CREATE INDEX "admin_notifications_type_created_at_idx"
    ON "admin_notifications"("type", "created_at");

CREATE UNIQUE INDEX "admin_notification_reads_notification_admin_key"
    ON "admin_notification_reads"("notification_id", "admin_id");

CREATE INDEX "admin_notification_reads_admin_read_at_idx"
    ON "admin_notification_reads"("admin_id", "read_at");

ALTER TABLE "admin_notification_reads"
    ADD CONSTRAINT "admin_notification_reads_notification_id_fkey"
    FOREIGN KEY ("notification_id") REFERENCES "admin_notifications"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "admin_notification_reads"
    ADD CONSTRAINT "admin_notification_reads_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;