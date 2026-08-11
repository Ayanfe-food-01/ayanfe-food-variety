---
name: Neon migration state
description: Environment constraint for the configured Neon database and existing Prisma migrations.
---

The configured Neon database may have the repository's existing Prisma migrations pending; the running API currently reports that the `products` and `categories` tables are missing.

**Why:** Live runtime verification exposed missing tables while the frontend still renders and the API process itself starts successfully.

**How to apply:** Before testing future database-backed flows, check migration status and confirm the target environment. Apply existing migrations through the normal Prisma deployment process when explicitly requested, then seed only when the development catalog is empty. Do not invent a replacement schema or silently migrate production.