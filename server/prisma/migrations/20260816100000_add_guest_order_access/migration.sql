ALTER TABLE "orders"
ADD COLUMN "guest_access_token_hash" VARCHAR(64);

CREATE UNIQUE INDEX "orders_guest_access_token_hash_key"
ON "orders"("guest_access_token_hash");