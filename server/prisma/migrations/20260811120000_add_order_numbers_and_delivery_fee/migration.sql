ALTER TABLE "orders"
  ADD COLUMN "order_number" VARCHAR(32),
  ADD COLUMN "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;

WITH numbered_orders AS (
  SELECT
    "id",
    'AFV-' || to_char("created_at", 'YYYY') || '-' ||
      lpad(row_number() OVER (ORDER BY "created_at", "id")::text, 6, '0') AS "order_number"
  FROM "orders"
)
UPDATE "orders"
SET "order_number" = numbered_orders."order_number"
FROM numbered_orders
WHERE "orders"."id" = numbered_orders."id";

ALTER TABLE "orders"
  ALTER COLUMN "order_number" SET NOT NULL;

CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

CREATE SEQUENCE "orders_order_number_seq";
SELECT setval(
  'orders_order_number_seq',
  GREATEST(COALESCE((SELECT COUNT(*) FROM "orders"), 0), 1),
  COALESCE((SELECT COUNT(*) FROM "orders"), 0) > 0
);