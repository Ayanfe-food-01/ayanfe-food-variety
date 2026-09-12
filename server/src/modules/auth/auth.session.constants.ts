/**
 * Session lifetime policy.
 *
 * Admin sessions are hardened with both an absolute lifetime and an idle
 * (inactivity) timeout. Every protected admin request must clear BOTH:
 *   - never older than ADMIN_SESSION_TTL (absolute cap), and
 *   - no more than ADMIN_INACTIVITY_TTL of meaningful activity behind.
 *
 * Customer sessions deliberately keep the legacy single absolute lifetime so
 * customer authentication behavior is not changed by admin hardening.
 */
export const CUSTOMER_SESSION_TTL_MS = 8 * 60 * 60 * 1000

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000

export const ADMIN_INACTIVITY_TTL_MS = 30 * 60 * 1000

/**
 * Throttle for persisting "last activity". The server refreshes the timestamp
 * at most once per interval per session so active use does not turn every
 * admin request into a write, while the in-memory check stays exact.
 */
export const ADMIN_ACTIVITY_TOUCH_INTERVAL_MS = 60 * 1000