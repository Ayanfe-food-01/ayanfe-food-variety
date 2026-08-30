-- AlterEnum
ALTER TYPE "QuoteRequestStatus" ADD VALUE 'ACCEPTED' BEFORE 'COMPLETED';

-- Add a fulfillment method to quoted quotes so a quotation knows whether it
-- will be fulfilled as pickup or delivery when it is later converted to an
-- order. Legacy priced quotes have their method inferred from the stored
-- delivery fee (a positive fee implies delivery).
ALTER TABLE "quote_requests" ADD COLUMN "fulfillment_method" "FulfillmentMethod";

UPDATE "quote_requests" SET "fulfillment_method" = CASE
  WHEN "delivery_fee" IS NOT NULL AND "delivery_fee" > 0 THEN 'DELIVERY'::"FulfillmentMethod"
  ELSE 'PICKUP'::"FulfillmentMethod"
END
WHERE "status" IN ('QUOTED', 'COMPLETED');

-- Once a quotation is concrete it must always know how it will be fulfilled.
-- The CHECK references the newly added 'ACCEPTED' enum value, so it is applied
-- in a follow-up migration after the enum change has been committed.
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_fulfillment_method_check"
  CHECK ("fulfillment_method" IS NOT NULL OR "status" NOT IN ('QUOTED', 'COMPLETED'));

-- Record the order produced when an accepted quotation is converted. The
-- unique constraint guarantees a quotation can only ever produce one order.
ALTER TABLE "quote_requests" ADD COLUMN "converted_order_id" UUID;
CREATE UNIQUE INDEX "quote_requests_converted_order_id_key" ON "quote_requests"("converted_order_id");
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_converted_order_id_fkey"
  FOREIGN KEY ("converted_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Record the quotation an order originated from. The unique constraint
-- guarantees an order can only ever originate from one quotation.
ALTER TABLE "orders" ADD COLUMN "quote_request_id" UUID;
CREATE UNIQUE INDEX "orders_quote_request_id_key" ON "orders"("quote_request_id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_request_id_fkey"
  FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION;