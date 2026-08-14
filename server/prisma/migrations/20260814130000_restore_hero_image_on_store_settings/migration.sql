-- The earlier hero image migration was superseded by the promotional banner
-- migration, but the storefront still uses the StoreSettings hero image as its
-- fallback. Restore the nullable column without rewriting existing settings.
ALTER TABLE "store_settings"
ADD COLUMN IF NOT EXISTS "hero_image" VARCHAR(1000);