CREATE TABLE "product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_images_product_order_key"
    ON "product_images"("product_id", "sort_order");

CREATE INDEX "product_images_product_id_idx"
    ON "product_images"("product_id");

ALTER TABLE "product_images"
    ADD CONSTRAINT "product_images_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

INSERT INTO "product_images" ("product_id", "url", "sort_order")
SELECT "id", "image", 0
FROM "products"
WHERE "image" IS NOT NULL AND "image" <> '';