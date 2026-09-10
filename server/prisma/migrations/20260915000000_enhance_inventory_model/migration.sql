-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('STOCK_RECEIVED', 'ORDER_DEDUCTION', 'CANCELLATION_RESTORATION', 'RETURN', 'DAMAGED', 'EXPIRED', 'MANUAL_ADJUSTMENT', 'OTHER');

-- AlterTable: Add low_stock_threshold to products
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" INTEGER NOT NULL DEFAULT 5;

-- AlterTable: Add low_stock_threshold to product_options
ALTER TABLE "product_options" ADD COLUMN "low_stock_threshold" INTEGER;

-- AlterTable: Add new columns to product_stock_adjustments
ALTER TABLE "product_stock_adjustments" ADD COLUMN "movement_type" "MovementType" NOT NULL DEFAULT 'MANUAL_ADJUSTMENT';
ALTER TABLE "product_stock_adjustments" ADD COLUMN "performed_by" VARCHAR(120);
ALTER TABLE "product_stock_adjustments" ADD COLUMN "notes" VARCHAR(500);

-- CreateIndex
CREATE INDEX "product_stock_adjustments_movement_type_idx" ON "product_stock_adjustments"("movement_type");
