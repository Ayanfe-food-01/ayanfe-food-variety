-- CreateIndex
CREATE INDEX "orders_archived_created_idx" ON "orders"("archived_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_payment_order_status_idx" ON "orders"("payment_status", "order_status");

-- CreateIndex
CREATE INDEX "payment_submissions_status_created_idx" ON "payment_submissions"("status", "created_at" DESC);