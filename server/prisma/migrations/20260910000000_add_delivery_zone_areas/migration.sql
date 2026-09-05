-- CreateTable
CREATE TABLE "delivery_zone_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_zone_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zone_areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zone_areas_area_id_key" ON "delivery_zone_areas"("area_id");

-- CreateIndex
CREATE INDEX "delivery_zone_areas_zone_id_idx" ON "delivery_zone_areas"("delivery_zone_id");

-- AddForeignKey
ALTER TABLE "delivery_zone_areas" ADD CONSTRAINT "delivery_zone_areas_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery_zone_areas" ADD CONSTRAINT "delivery_zone_areas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;