-- Wholesale packaging (carton/case) model.
--
-- Wholesale buyers now select ONE predefined package (e.g. "Carton") and then
-- enter how many complete packages they want. units_per_package records the
-- number of individual pieces inside one package; price is the cost of ONE
-- complete package and is the source of truth for wholesale billing.
--
-- The legacy wholesale_price_tiers table and product_options.wholesale_moq are
-- intentionally left in place so historical data is not destroyed; the new flow
-- uses wholesale_packages exclusively.

-- CreateTable
CREATE TABLE "wholesale_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "units_per_package" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wholesale_packages_product_active_idx" ON "wholesale_packages"("product_id", "is_active");

-- CreateIndex
CREATE INDEX "wholesale_packages_product_order_idx" ON "wholesale_packages"("product_id", "sort_order");

-- AlterTable
ALTER TABLE "customer_cart_items" ADD COLUMN "wholesale_package_id" UUID;

-- Cart lines become unique per (cart, product, option, wholesale package);
-- retail lines keep a NULL package id and wholesale lines keep a NULL option.
DROP INDEX "customer_cart_items_cart_product_option_key";

CREATE UNIQUE INDEX "customer_cart_items_cart_product_option_key"
  ON "customer_cart_items"("cart_id", "product_id", "product_option_id", "wholesale_package_id");

-- CreateIndex
CREATE INDEX "customer_cart_items_wholesale_package_id_idx" ON "customer_cart_items"("wholesale_package_id");

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "wholesale_package_id" UUID;
ALTER TABLE "order_items" ADD COLUMN "wholesale_package_name" VARCHAR(120);
ALTER TABLE "order_items" ADD COLUMN "wholesale_units_per_package" INTEGER;

-- CreateIndex
CREATE INDEX "order_items_wholesale_package_id_idx" ON "order_items"("wholesale_package_id");

-- AddForeignKey
ALTER TABLE "wholesale_packages" ADD CONSTRAINT "wholesale_packages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_cart_items" ADD CONSTRAINT "customer_cart_items_wholesale_package_id_fkey" FOREIGN KEY ("wholesale_package_id") REFERENCES "wholesale_packages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_wholesale_package_id_fkey" FOREIGN KEY ("wholesale_package_id") REFERENCES "wholesale_packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
