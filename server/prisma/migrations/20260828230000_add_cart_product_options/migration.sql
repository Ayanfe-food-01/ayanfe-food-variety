-- Add product option selection to customer cart items.
-- Cart lines become unique per (cart, product, option); legacy lines keep a NULL option.

ALTER TABLE "customer_cart_items" ADD COLUMN "product_option_id" UUID;

DROP INDEX "customer_cart_items_cart_product_key";

CREATE UNIQUE INDEX "customer_cart_items_cart_product_option_key"
  ON "customer_cart_items"("cart_id", "product_id", "product_option_id");

CREATE INDEX "customer_cart_items_cart_product_idx"
  ON "customer_cart_items"("cart_id", "product_id");

CREATE INDEX "customer_cart_items_product_option_id_idx"
  ON "customer_cart_items"("product_option_id");

ALTER TABLE "customer_cart_items"
  ADD CONSTRAINT "customer_cart_items_product_option_id_fkey"
  FOREIGN KEY ("product_option_id") REFERENCES "product_options"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;