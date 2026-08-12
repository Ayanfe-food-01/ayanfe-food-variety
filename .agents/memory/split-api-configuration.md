---
name: Split frontend/API configuration
description: Deployment constraints for a static Vercel frontend calling the Express API on another host.
---

For split deployments, frontend build-time variables must contain clean, deployment-specific values, and the API must allow the exact frontend origin through its environment-driven CORS configuration.

**Why:** A trailing period turns a valid `/api/v1` route into a different 404 path, while a stale `PUBLIC_APP_URL` makes generated canonical, sitemap, and robots URLs point at an old hostname even when the current frontend is reachable.

**How to apply:** Set Vercel's API and public-site variables for Preview and Production, set Render's CORS origin and public app URL without a trailing slash, then redeploy both services because static frontend variables are embedded during the build.