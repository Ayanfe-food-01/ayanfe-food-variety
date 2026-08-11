ALTER TABLE "orders"
  ADD COLUMN "checkout_key" UUID;

CREATE UNIQUE INDEX "orders_checkout_key_key" ON "orders"("checkout_key");