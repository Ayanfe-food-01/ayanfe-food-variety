
-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "request_key" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "quote_requests_request_key_key" ON "quote_requests"("request_key");


-- Quote numbers use a dedicated sequence so concurrent submissions never collide.
CREATE SEQUENCE "quote_requests_quote_number_seq";
SELECT setval(
  'quote_requests_quote_number_seq',
  GREATEST(COALESCE((SELECT COUNT(*) FROM "quote_requests"), 0), 1),
  COALESCE((SELECT COUNT(*) FROM "quote_requests"), 0) > 0
);
