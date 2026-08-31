-- Snapshot the selected product option on order items and track option stock
-- adjustments. Historical orders keep NULL option columns and are unaffected.

ALTER TABLE "order_items" ADD COLUMN "product_option_id" UUID;
ALTER TABLE "order_items" ADD COLUMN "product_option_label" VARCHAR(80);

CREATE INDEX "order_items_product_option_id_idx"
  ON "order_items"("product_option_id");

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_option_id_fkey"
  FOREIGN KEY ("product_option_id") REFERENCES "product_options"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "product_stock_adjustments" ADD COLUMN "product_option_id" UUID;

CREATE INDEX "product_stock_adjustments_product_option_id_idx"
  ON "product_stock_adjustments"("product_option_id");

ALTER TABLE "product_stock_adjustments"
  ADD CONSTRAINT "product_stock_adjustments_product_option_id_fkey"
  FOREIGN KEY ("product_option_id") REFERENCES "product_options"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;