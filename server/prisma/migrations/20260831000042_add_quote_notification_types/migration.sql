-- Phase 7: quote workflow notifications use the AdminNotificationType enum.
-- Enum values are added idempotently so the migration can be re-applied safely.
ALTER TYPE "AdminNotificationType" ADD VALUE IF NOT EXISTS 'NEW_QUOTE_REQUEST';
ALTER TYPE "AdminNotificationType" ADD VALUE IF NOT EXISTS 'QUOTE_ACCEPTED';
ALTER TYPE "AdminNotificationType" ADD VALUE IF NOT EXISTS 'QUOTE_REJECTED';