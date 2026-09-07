---
name: Replit workspace preview origin
description: Development CORS behavior when the storefront is opened inside the Replit workspace preview, especially on mobile.
---

Development previews opened inside the Replit workspace may send browser requests with `https://replit.com` as the origin, even when the app also has a separate `REPLIT_DEV_DOMAIN` hostname.

**Why:** The embedded mobile workspace preview produced a CORS rejection while direct local and `replit.dev` requests were already allowed.

**How to apply:** Keep `https://replit.com` in the development-only CORS allowlist. Do not use this fallback for production; production should continue to allow only the exact deployed frontend origin.