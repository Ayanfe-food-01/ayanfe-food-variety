-- CreateEnum
CREATE TYPE "DeliveryFeeMode" AS ENUM ('ZONE', 'FREE', 'CUSTOM');

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "city" VARCHAR(120),
ADD COLUMN     "city_id" UUID,
ADD COLUMN     "delivery_address" TEXT,
ADD COLUMN     "delivery_area_id" UUID,
ADD COLUMN     "delivery_area_name" VARCHAR(120),
ADD COLUMN     "delivery_fee_mode" "DeliveryFeeMode",
ADD COLUMN     "delivery_max_days" INTEGER,
ADD COLUMN     "delivery_min_days" INTEGER,
ADD COLUMN     "delivery_zone_id" UUID,
ADD COLUMN     "delivery_zone_name" VARCHAR(120),
ADD COLUMN     "state" VARCHAR(120),
ADD COLUMN     "state_id" UUID;

-- CreateIndex
CREATE INDEX "quote_requests_delivery_zone_id_idx" ON "quote_requests"("delivery_zone_id");

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

