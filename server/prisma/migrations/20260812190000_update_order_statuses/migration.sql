-- Replace the fulfillment enum while preserving all existing order and history rows.
-- PENDING orders are the new ORDER_PLACED state, and COMPLETED orders are DELIVERED.
ALTER TABLE "orders" ALTER COLUMN "order_status" DROP DEFAULT;

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM ('ORDER_PLACED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

ALTER TABLE "orders"
  ALTER COLUMN "order_status" TYPE "OrderStatus"
  USING (
    CASE "order_status"::text
      WHEN 'PENDING' THEN 'ORDER_PLACED'
      WHEN 'COMPLETED' THEN 'DELIVERED'
      ELSE "order_status"::text
    END
  )::"OrderStatus";

ALTER TABLE "order_status_history"
  ALTER COLUMN "previous_status" TYPE "OrderStatus"
  USING (
    CASE
      WHEN "previous_status" IS NULL THEN NULL
      WHEN "previous_status"::text = 'PENDING' THEN 'ORDER_PLACED'
      WHEN "previous_status"::text = 'COMPLETED' THEN 'DELIVERED'
      ELSE "previous_status"::text
    END
  )::"OrderStatus";

ALTER TABLE "order_status_history"
  ALTER COLUMN "new_status" TYPE "OrderStatus"
  USING (
    CASE "new_status"::text
      WHEN 'PENDING' THEN 'ORDER_PLACED'
      WHEN 'COMPLETED' THEN 'DELIVERED'
      ELSE "new_status"::text
    END
  )::"OrderStatus";

DROP TYPE "OrderStatus_old";

ALTER TABLE "orders" ALTER COLUMN "order_status" SET DEFAULT 'ORDER_PLACED';