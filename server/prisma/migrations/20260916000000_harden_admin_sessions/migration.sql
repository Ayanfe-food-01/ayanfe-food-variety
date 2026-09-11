-- AlterTable: Track admin activity for the idle-session timeout. Existing
-- rows are backfilled with their creation time (they have not been idle yet
-- by definition on the first deploy with this column).
ALTER TABLE "admin_sessions" ADD COLUMN "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "admin_sessions_expiry_activity_idx" ON "admin_sessions"("expires_at", "last_activity_at");