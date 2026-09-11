-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" SERIAL NOT NULL,
    "admin_user_id" UUID,
    "admin_email" VARCHAR(255),
    "event" VARCHAR(64) NOT NULL,
    "resource" VARCHAR(64),
    "resource_id" TEXT,
    "method" VARCHAR(12),
    "path" TEXT,
    "status_code" INTEGER,
    "ip_address" VARCHAR(45),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_user_created_idx" ON "admin_audit_logs"("admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_event_created_idx" ON "admin_audit_logs"("event", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_idx" ON "admin_audit_logs"("created_at");