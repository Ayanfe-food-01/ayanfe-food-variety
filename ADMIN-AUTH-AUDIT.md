# Phase 1 — Admin Authentication Security Audit

Date: 2026-09-11
Scope: Admin authentication/session hardening for Ayanfe Food Variety (Vercel SPA + Render API + Neon PostgreSQL). This audit precedes all code changes; nothing has been modified yet.

---

## 1. Current admin auth architecture

- **Server-side opaque sessions.** Login issues a random 32-byte token (`crypto.randomBytes(32).toString('base64url')`). Only the HMAC-SHA256 hash of that token is stored (`hashSessionToken` using `SESSION_SECRET`). The raw token lives in an **HttpOnly** cookie.
- **Admin session store.** PostgreSQL table `admin_sessions` via Prisma `AdminSession` model (`server/prisma/schema.prisma:700`). Fields: `id`, `userId`, `tokenHash` (unique), `expiresAt`, `revokedAt`, `createdAt`. **No `lastActivityAt` column exists.**
- **Login.** `POST /api/v1/auth/login` → `login()` in `server/src/modules/auth/auth.session.service.ts` looks up the user by email, verifies the password with scrypt, and decides "admin" vs "customer" purely from `user.role`. Admin sessions are created through `createSession(user, 'admin')`. The same endpoint serves customers (`createSession(user, 'customer')`) — there is no dedicated admin login route.
- **Cookie.** `ayanfe_admin_session` (name defined in `auth.primitives.ts`). httpOnly, `Secure` in production, `SameSite=None` in production / `Lax` in development, path `/`.
- **Frontend portal.** The Vercel SPA calls APIs through the **first-party proxy**: `VITE_API_URL=/api/v1`, and `client/vercel.json` + root `vercel.json` rewrite `/api/v1/*` → `https://ayanfe-food-variety.onrender.com/api/v1/*`. Browser requests therefore target `https://www.ayanfefoodvariety.com.ng/api/v1/...` (same site as the page). `client/src/services/api.ts` always sends `credentials: 'include'`.
- **Admin guard.** All `server/src/modules/admin/admin.routes.ts` routes are mounted behind `adminRoutes.use(...requireAdminAccess)` (`admin.middleware.ts`). `requireAdminAccess = [requireAdminAuthentication, requireAdminRole]`.
- **Frontend guard.** `RequireAdmin` (`client/src/components/admin/RequireAdmin.tsx`) calls `GET /api/v1/auth/me` on mount; if the user is not an admin it `<Navigate replace to="/login">`. There is no dedicated `/admin/login` page; `/admin/login` just redirects to `/login` (`App.tsx:165`).

## 2. Where admin sessions are stored

PostgreSQL `admin_sessions`. The browser stores only the raw token in the `ayanfe_admin_session` HttpOnly cookie. Nothing admin-related is stored in `localStorage`/`sessionStorage`; the only storage keys are cosmetic (`admin-sidebar-collapsed`) and a guest/auth navigation hint (`ayanfe-auth-return` in sessionStorage, not a credential).

## 3. How the backend decides a session is valid

`getAuthenticatedUser(token)` (`auth.session.service.ts:63`) looks up `AdminSession` by token hash and requires:

- a matching row,
- `revokedAt` is null,
- `expiresAt > now`.

If all hold it returns the user. **There is no inactivity check and no per-request sliding refresh.**

## 4. Current expiration behavior

- Absolute-only **8 hours** (`SESSION_TTL_MS = 8 * 60 * 60 * 1000`), fixed at session creation.
- No `lastActivityAt`, no idle timeout, no sliding extension, no cleanup of stale rows.
- The 8h value is shared between admin and customer sessions (`createSession`).

## 5. Current cookie settings

| Attribute | Production | Development |
|---|---|---|
| Name | `ayanfe_admin_session` | same |
| HttpOnly | true | true |
| Secure | true | false |
| SameSite | **None** | Lax |
| Path | `/` | `/` |
| Max-Age | 8 h | 8 h |

`SameSite=None` was required in the older architecture when the SPA called the Render origin cross-site. The **first-party proxy is now in place**, so `SameSite=None` is no longer necessary and is over-permissive (the cookie is eligible for cross-site subresource requests — a CSRF amplification risk given admin APIs are write-heavy). Google OAuth state cookies use `SameSite=Lax`, `Secure` in prod.

## 6. Is admin auth vulnerable to indefinite sessions?

**No absolute indefinite session** — there is a hard 8 h cap. However: an obtained/stolen admin token remains usable for up to 8 h with zero idle protection, and idle admins' sessions never decay, so the effective exposure window is the full 8 h.

## 7. Security problems discovered

1. **No inactivity timeout** — an idle admin session stays valid for the full 8 h. (Fix target: 30 min idle.)
2. **`SameSite=None` in production** is an unnecessary third-party-cookie posture now that `/api/v1` is first-party via the Vercel rewrite; it weakens CSRF posture. (Fix target: `Lax`.)
3. **No admin-specific failed-login throttling.** The shared `POST /auth/login` has a generic in-memory per-IP/per-path limit (10 req / 15 min), but no per-account response to repeated wrong passwords for an admin account.
4. **Admin Google OAuth is deliberately blocked.** `findOrCreateGoogleCustomer` throws `403 "Google sign-in is available for customer accounts only."` when the Google email maps to a non-customer (`customer-auth.login.service.ts:85`). There is no admin Google flow. Per the requirement, admin auth must support both email/password and Google OAuth without auto-creating admins.
5. **No audit trail** of admin security events (login, failed login, logout, expiry) or administrative mutations (order status, inventory, product/price changes, settings/delivery-fee changes).
6. **No `Cache-Control: no-store`** on admin API responses (only `/auth/me` sets it) → back-button/browser-cache exposure risk after logout.
7. **Session expiry UX** — a 401 during active admin use leaves pages in a broken state (RequireAdmin only checks on mount, so mid-session expiry isn't handled centrally).
8. **Neutralized-but-worth-noting:** rate-limiter and (future) failure counters are in-memory maps — OK on Render's single instance, but weaker across multiple instances.

## 8. iPhone / Safari compatibility risks

- The **first-party `/api/v1` proxy is the key enabler**: Safari ITP blocks third-party cookies, but these are first-party HttpOnly cookies set/resent on `www.ayanfefoodvariety.com.ng`, so they survive normal and Private browsing as long as requests are same-origin.
- `SameSite=None` keeps the door open to third-party contexts; moving to `Lax` is compatible **only because** API calls are same-site (same origin through the proxy). No code path should direct-call the bare Render origin from the browser.
- Google OAuth: the flow is a top-level navigation (`window.location.assign(getGoogleSignInUrl())`), callback comes back first-party through the proxy, and the state/nonce cookies are `SameSite=Lax` + `Secure` — compatible with Safari Private. This must be preserved for the new admin Google flow.

## 9. Files that will need modification

Backend:
- `server/prisma/schema.prisma` — add `AdminSession.lastActivityAt`; add `AdminAuditLog` model.
- New migration folder under `server/prisma/migrations/`.
- `server/src/modules/auth/auth.primitives.ts` — TTLs, cookie policy (`SameSite=Lax`), admin inactivity constant.
- `server/src/modules/auth/auth.session.service.ts` — inactivity enforcement + activity touch; per-kind absolute TTLs.
- `server/src/modules/auth/auth.admin.service.ts` — admin Google login binding (existing-admin-only).
- `server/src/modules/auth/auth.google.ts` — reuse OAuth verification for admin flow (no changes to customer flow).
- `server/src/modules/auth/auth.controller.ts`, `auth.routes.ts` — admin Google start/callback + audit hooks + failed-login guard.
- New `server/src/modules/auth/admin.login.guard.ts` — per-administrator-account failed-attempt limiting.
- New `server/src/modules/audit/` module — audit-log service + protected list route.
- `server/src/modules/admin/admin.middleware.ts` / `admin.routes.ts` — `Cache-Control: no-store` for admin responses.
- Audit hooks: `server/src/modules/admin/admin.controller.ts`, `admin-order.status.service.ts` (already has adminId), `server/src/modules/inventory/inventory.controller.ts`, `server/src/modules/products/admin-product.controller.ts`, `server/src/modules/settings/settings.controller.ts`, delivery-zone controller.

Frontend:
- `client/src/App.tsx` — dedicated `/admin/login` route.
- `client/src/components/admin/RequireAdmin.tsx` — redirect to `/admin/login` with reason, re-validate on focus.
- `client/src/pages/Admin/` — new `AdminLogin.tsx` (standalone login card) if warranted, else reuse `LoginModal`.
- `client/src/components/auth/LoginModal.tsx` — expose Google sign-in for the admin path pointing to the admin Google endpoint.
- `client/src/services/api.ts` — centralized 401 handling for `/admin/*` → `/admin/login?reason=expired` (loop-safe).
- `client/src/services/authService.ts` — `getAdminGoogleSignInUrl()`.

## 10. Recommended implementation approach

Incremental hardening on the existing, fundamentally sound server-side session architecture — **no redesign required**:

1. DB: add `lastActivityAt` to `AdminSession` (30 min idle) and keep an absolute lifetime (raise cap to 12 h). Enforce both in `getAuthenticatedUser` and touch activity on each authenticated admin request (throttled).
2. Cookie: production `SameSite=Lax`, keep `Secure` + `HttpOnly`, `Path=/`, Max-Age aligned with the absolute TTL. Add `Cache-Control: no-store` to all admin responses.
3. Add a dedicated admin Google OAuth flow (start + callback) that binds **only to existing accounts with `role=ADMIN`** — never auto-creates an admin. Leave the customer Google flow untouched.
4. Frontend: real `/admin/login` page, session-expiry redirect with a clear message, global 401 handling for admin API calls, Google option on the admin login.
5. Admin login protection: per-account failed-attempt limiter keyed by the admin email (in addition to the existing per-IP limit); audit-log admin login success/failure/logout/expiry and key admin mutations.
6. Verify full regression (typecheck/build/lint) and document iPhone Safari (normal + Private) expectations and any manual production configuration.

No stop condition triggered: the existing architecture does **not** require a redesign.