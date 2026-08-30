-- The 'ACCEPTED' enum value added by 20260831000040 is now committed, so the
-- fulfillment-method guarantee can be extended to accepted quotations.
ALTER TABLE "quote_requests" DROP CONSTRAINT "quote_requests_fulfillment_method_check";
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_fulfillment_method_check"
  CHECK ("fulfillment_method" IS NOT NULL OR "status" NOT IN ('QUOTED', 'ACCEPTED', 'COMPLETED'));