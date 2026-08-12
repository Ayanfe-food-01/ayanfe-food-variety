---
name: Split frontend/API configuration
description: Deployment constraints for a static Vercel frontend calling the Express API on another host.
---

For split deployments, the frontend build-time API variable must contain a clean API base with no sentence punctuation, and the API must allow the exact frontend origin through its environment-driven CORS configuration.

**Why:** A trailing period turns a valid `/api/v1` route into a different 404 path, while a missing `Access-Control-Allow-Origin` header makes a browser report the cross-origin request as unreachable even when curl can reach the API.

**How to apply:** Set the Vercel API variable for Preview and Production, set Render's CORS origin and public app URL without a trailing slash, then redeploy both services because static frontend variables are embedded during the build.