CREATE TYPE "FulfillmentMethod" AS ENUM ('PICKUP', 'DELIVERY');

ALTER TABLE "orders"
ADD COLUMN "fulfillment_method" "FulfillmentMethod" NOT NULL DEFAULT 'DELIVERY';