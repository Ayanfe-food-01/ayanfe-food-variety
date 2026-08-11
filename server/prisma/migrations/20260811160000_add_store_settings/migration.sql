-- CreateTable
CREATE TABLE "store_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "singleton_key" VARCHAR(40) NOT NULL DEFAULT 'default',
    "business_name" VARCHAR(180) NOT NULL,
    "business_email" VARCHAR(255) NOT NULL,
    "business_phone" VARCHAR(40) NOT NULL,
    "whatsapp_number" VARCHAR(40) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_settings_singleton_key_key" ON "store_settings"("singleton_key");