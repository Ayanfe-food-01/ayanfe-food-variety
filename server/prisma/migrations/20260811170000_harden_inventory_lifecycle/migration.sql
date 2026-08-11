ALTER TABLE "orders"
ADD COLUMN "stock_deducted_at" TIMESTAMPTZ(6),
ADD COLUMN "stock_restored_at" TIMESTAMPTZ(6);

CREATE TABLE "product_stock_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "order_id" UUID,
    "quantity_delta" INTEGER NOT NULL,
    "previous_quantity" INTEGER NOT NULL,
    "new_quantity" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_stock_adjustments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_stock_adjustments_previous_quantity_check" CHECK ("previous_quantity" >= 0),
    CONSTRAINT "product_stock_adjustments_new_quantity_check" CHECK ("new_quantity" >= 0),
    CONSTRAINT "product_stock_adjustments_delta_check" CHECK ("quantity_delta" <> 0)
);

CREATE INDEX "product_stock_adjustments_product_created_idx"
ON "product_stock_adjustments"("product_id", "created_at");

CREATE INDEX "product_stock_adjustments_order_id_idx"
ON "product_stock_adjustments"("order_id");

ALTER TABLE "product_stock_adjustments"
ADD CONSTRAINT "product_stock_adjustments_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "product_stock_adjustments"
ADD CONSTRAINT "product_stock_adjustments_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;