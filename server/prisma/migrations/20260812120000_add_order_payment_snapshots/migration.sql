-- Add method identity to the existing payment settings architecture.
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER');

ALTER TABLE "payment_settings"
  ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER';

DROP INDEX "payment_settings_singleton_key_key";
DROP INDEX "payment_settings_one_active_idx";
CREATE UNIQUE INDEX "payment_settings_singleton_method_key"
  ON "payment_settings"("singleton_key", "payment_method");

ALTER TABLE "orders"
  ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER';

CREATE TABLE "order_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "bank_name" VARCHAR(180) NOT NULL,
    "account_name" VARCHAR(180) NOT NULL,
    "account_number" VARCHAR(80) NOT NULL,
    "instructions" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_payments_order_id_key" ON "order_payments"("order_id");

ALTER TABLE "order_payments"
  ADD CONSTRAINT "order_payments_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- Preserve the payment details available at migration time for historical orders.
INSERT INTO "order_payments" (
  "order_id",
  "payment_method",
  "bank_name",
  "account_name",
  "account_number",
  "instructions"
)
SELECT
  orders."id",
  settings."payment_method",
  settings."bank_name",
  settings."account_name",
  settings."account_number",
  settings."instructions"
FROM "orders" AS orders
JOIN "payment_settings" AS settings
  ON settings."singleton_key" = 'default'
 AND settings."payment_method" = 'BANK_TRANSFER';