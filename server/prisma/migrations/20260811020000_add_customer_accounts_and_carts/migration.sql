-- Extend the existing user/auth architecture for customer accounts.
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';

ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL,
  ADD COLUMN "phone" VARCHAR(40);

ALTER TABLE "orders"
  ADD COLUMN "user_id" UUID;

CREATE TABLE "customer_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_cart_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_sessions_token_hash_key" ON "customer_sessions"("token_hash");
CREATE INDEX "customer_sessions_user_id_idx" ON "customer_sessions"("user_id");
CREATE INDEX "customer_sessions_expires_at_idx" ON "customer_sessions"("expires_at");
CREATE UNIQUE INDEX "customer_carts_user_id_key" ON "customer_carts"("user_id");
CREATE UNIQUE INDEX "customer_cart_items_cart_product_key" ON "customer_cart_items"("cart_id", "product_id");
CREATE INDEX "customer_cart_items_product_id_idx" ON "customer_cart_items"("product_id");
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

ALTER TABLE "customer_sessions"
  ADD CONSTRAINT "customer_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "customer_carts"
  ADD CONSTRAINT "customer_carts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "customer_cart_items"
  ADD CONSTRAINT "customer_cart_items_cart_id_fkey"
  FOREIGN KEY ("cart_id") REFERENCES "customer_carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "customer_cart_items"
  ADD CONSTRAINT "customer_cart_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;