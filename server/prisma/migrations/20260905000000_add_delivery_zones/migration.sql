-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "free_delivery_threshold" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zones_name_key" ON "delivery_zones"("name");

-- CreateIndex
CREATE INDEX "delivery_zones_active_order_idx" ON "delivery_zones"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "delivery_zones_sort_order_idx" ON "delivery_zones"("sort_order");

-- AlterTable (historical snapshot: nullable so existing orders are unaffected)
ALTER TABLE "orders"
    ADD COLUMN "delivery_zone_id" UUID,
    ADD COLUMN "delivery_zone_name" VARCHAR(120);

-- CreateIndex
CREATE INDEX "orders_delivery_zone_id_idx" ON "orders"("delivery_zone_id");

-- AddForeignKey (optional traceability; name + fee snapshot remain authoritative)
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE NO ACTION;