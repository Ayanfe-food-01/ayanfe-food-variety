---
name: Static crawl-control files
description: Reliability rule for robots.txt and sitemap files on split static frontend deployments.
---

`robots.txt` should be served as a static frontend asset generated from the build-time `PUBLIC_APP_URL`, not through a request-time serverless function or a hardcoded domain.

**Why:** A serverless invocation failure on an otherwise healthy Vercel homepage returns a 500 for the crawler’s first site-wide access check, which Google reports as “Robots.txt unreachable.” Hardcoded hostnames become stale when domains change, while build-time configuration keeps generated URLs aligned with the deployed origin.

**How to apply:** Require `PUBLIC_APP_URL` during frontend builds, generate valid plain-text robots and XML sitemap files with absolute URLs, and configure the same generated responses for local development. If the sitemap is also dynamic, provide a tested static fallback or verify its production endpoint separately before referencing it. Keep every sitemap source in sync when public routes are added, especially the static Vite fallback and any duplicate serverless handler.