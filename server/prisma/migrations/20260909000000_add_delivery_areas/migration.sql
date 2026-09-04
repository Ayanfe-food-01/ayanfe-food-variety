-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "areas_city_name_key" ON "areas"("city_id", "name");

-- CreateIndex
CREATE INDEX "areas_city_active_idx" ON "areas"("city_id", "is_active");

-- CreateIndex
CREATE INDEX "areas_city_id_idx" ON "areas"("city_id");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AlterTable: nullable columns so historical orders are unaffected.
ALTER TABLE "orders"
    ADD COLUMN "state" VARCHAR(120),
    ADD COLUMN "delivery_area_id" UUID,
    ADD COLUMN "delivery_area_name" VARCHAR(120);

-- CreateIndex
CREATE INDEX "orders_delivery_area_id_idx" ON "orders"("delivery_area_id");

-- AddForeignKey (informational traceability; the name snapshot is authoritative)
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_area_id_fkey" FOREIGN KEY ("delivery_area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;