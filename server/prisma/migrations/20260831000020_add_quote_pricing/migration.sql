-- AlterTable
ALTER TABLE "quote_request_items" ADD COLUMN     "quoted_unit_price" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "delivery_fee" DECIMAL(12,2);
ALTER TABLE "quote_requests" ADD COLUMN     "quoted_at" TIMESTAMPTZ(6);
ALTER TABLE "quote_requests" ADD COLUMN     "quoted_subtotal" DECIMAL(12,2);
ALTER TABLE "quote_requests" ADD COLUMN     "quoted_total" DECIMAL(12,2);


-- A quoted unit price, when present, must be a positive amount.
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_quoted_unit_price_check" CHECK ("quoted_unit_price" IS NULL OR "quoted_unit_price" > 0);

-- A delivery fee on a quotation, when present, must be non-negative.
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_delivery_fee_check" CHECK ("delivery_fee" IS NULL OR "delivery_fee" >= 0);