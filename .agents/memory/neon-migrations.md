---
name: Neon migration state
description: Environment constraint for the configured Neon database and existing Prisma migrations.
---

The configured Neon database initially had the repository's existing Prisma migrations pending; they have now been applied in development and the catalog has been seeded.

**Why:** Live runtime verification exposed missing tables while Prisma schema validation and production builds still passed.

**How to apply:** Before testing future database-backed flows, check migration status and confirm the target environment. Apply existing migrations through the normal Prisma deployment process when needed, then seed only when the development catalog is empty. Do not invent a replacement schema or silently migrate production.