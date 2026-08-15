ALTER TABLE "orders"
ADD COLUMN "archived_at" TIMESTAMPTZ(6),
ADD COLUMN "archived_by_id" UUID;

CREATE INDEX "orders_archived_at_idx" ON "orders"("archived_at");

ALTER TABLE "orders"
ADD CONSTRAINT "orders_archived_by_id_fkey"
FOREIGN KEY ("archived_by_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE NO ACTION;