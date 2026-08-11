ALTER TABLE "products"
ADD COLUMN "stock_quantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "products"
ADD CONSTRAINT "products_stock_quantity_check" CHECK ("stock_quantity" >= 0);

CREATE INDEX "products_stock_quantity_idx" ON "products"("stock_quantity");