ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "products_featured_active_idx"
ON "products"("is_featured", "is_active");