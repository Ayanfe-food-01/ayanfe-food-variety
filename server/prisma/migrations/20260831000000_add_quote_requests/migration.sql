
-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'QUOTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_number" VARCHAR(32) NOT NULL,
    "user_id" UUID,
    "customer_name" VARCHAR(180) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(40) NOT NULL,
    "message" TEXT,
    "shopping_mode" "ShoppingMode",
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_request_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_request_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_option_id" UUID,
    "product_name" VARCHAR(180) NOT NULL,
    "product_option_label" VARCHAR(80),
    "quantity" INTEGER NOT NULL,
    "note" VARCHAR(500),

    CONSTRAINT "quote_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_requests_quote_number_key" ON "quote_requests"("quote_number");

-- CreateIndex
CREATE INDEX "quote_requests_user_created_idx" ON "quote_requests"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quote_requests_user_status_idx" ON "quote_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "quote_requests_status_created_idx" ON "quote_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quote_requests_status_idx" ON "quote_requests"("status");

-- CreateIndex
CREATE INDEX "quote_requests_customer_email_idx" ON "quote_requests"("customer_email");

-- CreateIndex
CREATE INDEX "quote_requests_customer_phone_idx" ON "quote_requests"("customer_phone");

-- CreateIndex
CREATE INDEX "quote_request_items_request_id_idx" ON "quote_request_items"("quote_request_id");

-- CreateIndex
CREATE INDEX "quote_request_items_product_id_idx" ON "quote_request_items"("product_id");

-- CreateIndex
CREATE INDEX "quote_request_items_product_option_id_idx" ON "quote_request_items"("product_option_id");

-- CreateIndex
CREATE UNIQUE INDEX "quote_request_items_request_product_option_key" ON "quote_request_items"("quote_request_id", "product_id", "product_option_id");

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_product_option_id_fkey" FOREIGN KEY ("product_option_id") REFERENCES "product_options"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;


-- Enforce positive requested quantities
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_quantity_check" CHECK ("quantity" > 0);
