-- AlterTable
ALTER TABLE "delivery_zones" ADD COLUMN "min_delivery_days" INTEGER,
    ADD COLUMN "max_delivery_days" INTEGER;

-- Existing zones retain NULL for both columns until an admin configures them.
-- No data is modified, deleted, or backfilled.
