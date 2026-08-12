-- AlterTable
ALTER TABLE "products"
ADD COLUMN "delivery_fee" DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_items"
ADD COLUMN "delivery_fee" DECIMAL(12, 2) NOT NULL DEFAULT 0;