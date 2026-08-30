-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "user_id" UUID,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_name" VARCHAR(180) NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "avatar_url" VARCHAR(1000),
    "avatar_public_id" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_item_key" ON "reviews"("order_item_id");

-- CreateIndex
CREATE INDEX "reviews_product_status_idx" ON "reviews"("product_id", "status");

-- CreateIndex
CREATE INDEX "reviews_product_featured_order_idx" ON "reviews"("product_id", "is_featured", "display_order");

-- CreateIndex
CREATE INDEX "reviews_featured_active_order_idx" ON "reviews"("is_featured", "is_active", "display_order");

-- CreateIndex
CREATE INDEX "reviews_user_created_idx" ON "reviews"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reviews_order_id_idx" ON "reviews"("order_id");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "testimonials_active_order_idx" ON "testimonials"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "testimonials_active_featured_order_idx" ON "testimonials"("is_active", "is_featured", "display_order");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Rating and content guards (mirror order_item quantity_check).
-- Ratings are enforced at the database layer so invalid values can never be stored.
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_content_check" CHECK (btrim("content") <> '');

-- Testimonials are admin-managed; ratings are optional so a testimonial can be
-- accepted without being graded.
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_content_check" CHECK (btrim("content") <> '');