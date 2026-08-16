ALTER TABLE "store_settings"
  ADD COLUMN "logo_url" VARCHAR(1000),
  ADD COLUMN "logo_public_id" VARCHAR(255),
  ADD COLUMN "favicon_url" VARCHAR(1000),
  ADD COLUMN "favicon_public_id" VARCHAR(255);