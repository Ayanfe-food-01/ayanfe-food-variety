---
name: Static crawl-control files
description: Reliability rule for robots.txt and sitemap files on split static frontend deployments.
---

`robots.txt` should be served as a static frontend asset, not through a request-time serverless function, unless that function has independent production monitoring and a tested fallback.

**Why:** A serverless invocation failure on an otherwise healthy Vercel homepage returns a 500 for the crawler’s first site-wide access check, which Google reports as “Robots.txt unreachable.” Static assets avoid application, database, and runtime configuration failures.

**How to apply:** Keep robots.txt valid plain text with an explicit crawl policy and absolute sitemap URL. If the sitemap is also dynamic, provide a tested static fallback or verify its production endpoint separately before referencing it.