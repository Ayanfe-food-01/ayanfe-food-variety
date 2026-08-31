-- AlterTable
ALTER TABLE "wholesale_price_tiers" ADD COLUMN     "max_quantity" INTEGER;

-- AlterTable
ALTER TABLE "product_options" ADD COLUMN     "wholesale_moq" INTEGER;