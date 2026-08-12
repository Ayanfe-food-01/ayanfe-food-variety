-- AlterTable
ALTER TABLE "store_settings"
ADD COLUMN "call_to_order_phone" VARCHAR(40) NOT NULL DEFAULT '08125595879',
ADD COLUMN "announcement_text" VARCHAR(2000) NOT NULL DEFAULT 'Quality foodstuff, delivered with care';