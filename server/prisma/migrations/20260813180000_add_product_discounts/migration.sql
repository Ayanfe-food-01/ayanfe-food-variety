-- CreateEnum
CREATE TYPE "ProductDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterTable
ALTER TABLE "products"
ADD COLUMN "discount_type" "ProductDiscountType",
ADD COLUMN "discount_value" DECIMAL(12, 2);