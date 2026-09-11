# Admin Authentication Security — Validation Report

Status: complete (code, migration, and documentation). Manual deployment
verification remains and is listed at the end.

## Policy implemented (backend-enforced)

| Item | Value |
| --- | --- |
| Absolute session lifetime | 12 hours (`ADMIN_SESSION_TTL_MS`) |
| Inactivity timeout | 30 minutes (`ADMIN_INACTIVITY_TTL_MS`) |
| Activity touch throttle | 60 s (`ADMIN_ACTIVITY_TOUCH_INTERVAL_MS`) |
| Cookie | `ayanfe_admin_session`, `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/` |
| Storage | PostgreSQL `admin_sessions`, token stored as HMAC-SHA256 hash of a 256-bit random value |
| Login throttling (account) | 5 failures per 15 min per admin email; `Retry-After` returned |
| Login throttling (IP) | existing `createRateLimit(10, 15min)` guard on `/auth/login` |
| Google admin sign-in | binds only to an existing `role=ADMIN` account; never auto-creates admins |
| Audit trail | `admin_audit_logs` (WHO/WHAT/WHEN/source IP, no secrets) |
| Response caching | `Cache-Control: no-store` on admin routes and logout |

`SameSite=Lax` is safe for iOS Safari Private mode because every browser API
call goes through the first-party Vercel `/api/v1` rewrite to Render. No
`localStorage`/`sessionStorage` is used for admin credentials.

## Phase-by-phase outcome

1. **Audit** — `ADMIN-AUTH-AUDIT.md`. No redesign needed; incremental hardening.
2. **Session lifetime** — `last_activity_at` column + index; per-kind TTLs;
   expired/inactive sessions rejected in `getAuthenticatedUser`.
3. **Cookie config** — `SameSite=Lax` for both auth cookies; `adminNoStore`
   middleware; no-store on logout.
4. **iPhone/Safari + proxy** — verified first-party routing; no code change.
5. **Session-expiry UX** — `/admin/login` page; `RequireAdmin` re-check on tab
   focus; global 401 → `/admin/login?reason=expired` with expiry message.
6. **Secure logout** — server revokes db sessions + clears matching cookies;
   admin logout navigates to `/admin/login`.
7. **Endpoint protection** — confirmed all admin controllers are mounted only
   under `adminRoutes.use(...requireAdminAccess)`; customer endpoints are
   auth- and ownership-scoped; public store endpoints are read-only.
8. **Login security** — per-account admin throttling (`admin.login.guard.ts`),
   locked accounts rejected before password verification.
9. **Audit log** — Prisma model + migration; request middleware; login
   success/failure, logout, and session-expiry events.
10. **Env/deploy safety** — no secrets tracked; `.env` gitignored;
    `render.yaml` + `server/.env.example` + `PRODUCTION.md` updated with the
    new Google OAuth variables and callback registration.
11. **Regression** — typechecks (client + server) pass, both production builds
    pass, Prisma schema validates, lint clean except ONE pre-existing error.
12. **This report.**

## Verification results

- `server` typecheck: PASS
- `client` typecheck: PASS
- `server` production build: PASS
- `client` production build: PASS
- `prisma validate`: PASS (needs `DATABASE_URL` at run time)
- Lint: PASS for all changed files. One remaining pre-existing, unrelated
  error: `client/src/context/CustomerAuthContext.tsx:84/96`
  `react-hooks/immutability` (`switchShoppingMode`). Left untouched to avoid
  risk to the customer flow; fix separately if desired.
- `npm test`: no automated tests configured in this repository.
- Prisma 7 warning: `package.json#prisma` config is deprecated (non-blocking).

## Changes committed

- `0c2512a` Phase 1 audit report
- `0696c02` Phase 2 session lifetime + inactivity
- `16c0e2f` Phase 3 cookie hardening + no-store
- `4f5c5cf` Phase 5 admin login UX + protected redirects
- `8b1a4d4` admin Google OAuth (strict, authorized-only)
- `ff5f07a` Phase 6 logout destination
- `578b874` Phase 8 admin login throttling
- `5d15f02` Phase 9 audit trail
- `b943d31` Phase 10 deployment docs (+ RequireAdmin lint fix folded in)
- (worktree clean; Phase 11/12 produce no further diff)

## Required manual steps (not verifiable in this workspace)

1. **Deploy the migration** — Render runs `prisma migrate deploy` on start;
   the new `admin_audit_logs` table and `last_activity_at` column are applied
   automatically. Confirm in Render logs.
2. **Set env vars on Render** — add `GOOGLE_ADMIN_REDIRECT_URI` (and the
   existing customer Google vars if sign-in must work). For production use
   `https://<store>/api/v1/auth/admin/google/callback` through the proxy.
3. **Google Cloud Console** — register both callback URLs in Authorized
   redirect URIs. For local dev, register the derived
   `http://localhost:5000/api/v1/auth/admin/google/callback`.
4. **iPhone/Safari Private-mode test** — open /admin/login in Safari Private,
   sign in with email/password and with Google, navigate, idle >30 min and
   confirm the expiry message, then sign back in. Repeat on Android Chrome.
5. **Audit log check** — perform a login, a failed login, an admin mutation and
   confirm rows in the `admin_audit_logs` table (advisory, via psql on Neon).
6. **Multi-account lockout note** — the throttle map and rate limiter are
   in-memory; exact on Render's single instance, per-instance if replicas are
   ever added.