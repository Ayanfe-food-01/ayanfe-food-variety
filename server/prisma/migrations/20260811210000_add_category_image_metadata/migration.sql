-- Store category image URLs and provider identifiers without storing binaries in Neon.
ALTER TABLE "categories"
  RENAME COLUMN "image" TO "image_url";

ALTER TABLE "categories"
  ADD COLUMN "image_public_id" VARCHAR(255);