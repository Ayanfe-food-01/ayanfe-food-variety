ALTER TABLE "store_settings" DROP COLUMN "hero_image";

CREATE TABLE "promotional_banners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(180) NOT NULL,
    "image_url" VARCHAR(1000) NOT NULL,
    "image_public_id" VARCHAR(255) NOT NULL,
    "promotional_text" VARCHAR(500),
    "button_text" VARCHAR(120),
    "destination" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promotional_banners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotional_banners_active_order_idx" ON "promotional_banners"("is_active", "display_order");
CREATE INDEX "promotional_banners_created_at_idx" ON "promotional_banners"("created_at");