-- CreateIndex
-- Speeds up the public product-review queries that filter an entire product's
-- APPROVED reviews and order them newest-first for the paginated list.
CREATE INDEX "reviews_public_product_created_idx" ON "reviews"("product_id", "status", "created_at" DESC);