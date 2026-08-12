---
name: Render Free migration startup
description: How this API applies Prisma migrations when Render locks the pre-deploy command.
---

When Render Free does not allow a separate pre-deploy command, run `prisma migrate deploy` in the production start script immediately before starting Express, with a bounded retry for transient advisory-lock timeouts.

**Why:** The service cannot serve traffic until the schema is current, and a failed migration should prevent startup rather than expose an incompatible API.

**How to apply:** Leave Render's Pre-Deploy Command blank, keep the root directory as `server`, build with `npm ci && npm run build`, and start with `npm run start`. Retry only P1002/advisory-lock failures; keep configuration and real migration errors fatal. Keep the Neon URL and session/database secrets configured before deploy.