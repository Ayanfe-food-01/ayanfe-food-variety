-- A wholesale package (carton/case) now belongs to a specific unit/size
-- (a ProductOption, e.g. "5kg"), giving the relationship
--   Product -> Unit/Size (ProductOption) -> WholesalePackage.
-- product_option_id is nullable so existing product-level packages and
-- products with no size variants keep working (product's single unit).
ALTER TABLE "wholesale_packages" ADD COLUMN "product_option_id" UUID;

-- Existing packages (linked only to a product, no unit/size) remain valid;
-- they represent the product's single unit.

CREATE INDEX "wholesale_packages_product_option_id_idx" ON "wholesale_packages"("product_option_id");

ALTER TABLE "wholesale_packages" ADD CONSTRAINT "wholesale_packages_product_option_id_fkey"
  FOREIGN KEY ("product_option_id") REFERENCES "product_options"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
