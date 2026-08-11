-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "previous_status" "OrderStatus",
    "new_status" "OrderStatus" NOT NULL,
    "changed_by" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_status_history_order_created_idx" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "order_status_history_changed_by_idx" ON "order_status_history"("changed_by");

-- AddForeignKey
ALTER TABLE "order_status_history"
ADD CONSTRAINT "order_status_history_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_status_history"
ADD CONSTRAINT "order_status_history_changed_by_fkey"
FOREIGN KEY ("changed_by") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE NO ACTION;