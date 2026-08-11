-- Add database-backed category management fields.
ALTER TABLE "categories"
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "categories"
  ALTER COLUMN "image" SET DEFAULT '';

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");