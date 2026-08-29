-- CreateEnum
CREATE TYPE "ShoppingMode" AS ENUM ('RETAIL', 'WHOLESALE');

-- DropIndex
DROP INDEX "customer_carts_user_id_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "shopping_mode" "ShoppingMode" NOT NULL DEFAULT 'RETAIL';

-- AlterTable
ALTER TABLE "customer_carts" ADD COLUMN     "mode" "ShoppingMode" NOT NULL DEFAULT 'RETAIL';

-- CreateTable
CREATE TABLE "wholesale_price_tiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "product_option_id" UUID,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wholesale_price_tiers_product_min_qty_idx" ON "wholesale_price_tiers"("product_id", "min_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_price_tiers_product_option_min_qty_key" ON "wholesale_price_tiers"("product_id", "product_option_id", "min_quantity");

-- CreateIndex
CREATE INDEX "customer_carts_user_mode_idx" ON "customer_carts"("user_id", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "customer_carts_user_mode_key" ON "customer_carts"("user_id", "mode");

-- AddForeignKey
ALTER TABLE "wholesale_price_tiers" ADD CONSTRAINT "wholesale_price_tiers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wholesale_price_tiers" ADD CONSTRAINT "wholesale_price_tiers_product_option_id_fkey" FOREIGN KEY ("product_option_id") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION;