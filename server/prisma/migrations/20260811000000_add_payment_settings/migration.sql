-- CreateTable
CREATE TABLE "payment_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "singleton_key" VARCHAR(40) NOT NULL DEFAULT 'default',
    "bank_name" VARCHAR(180) NOT NULL,
    "account_name" VARCHAR(180) NOT NULL,
    "account_number" VARCHAR(80) NOT NULL,
    "instructions" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_settings_singleton_key_key" ON "payment_settings"("singleton_key");
CREATE INDEX "payment_settings_active_idx" ON "payment_settings"("is_active");
CREATE UNIQUE INDEX "payment_settings_one_active_idx" ON "payment_settings"("is_active") WHERE "is_active" = true;