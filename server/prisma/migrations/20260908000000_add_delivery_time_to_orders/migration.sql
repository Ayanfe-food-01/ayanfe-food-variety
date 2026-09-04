-- AlterTable
ALTER TABLE "orders" ADD COLUMN "delivery_min_days" INTEGER,
    ADD COLUMN "delivery_max_days" INTEGER;

-- Existing orders retain NULL for both columns until a new order is placed
-- through checkout (which snapshots the resolved zone's delivery time).
-- No data is modified, deleted, or backfilled.
