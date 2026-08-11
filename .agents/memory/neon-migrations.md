---
name: Neon migration state
description: Environment constraint for the configured Neon database and existing Prisma migrations.
---

The configured Neon database can have the repository's existing Prisma migrations pending. In that state, the API starts but Prisma-backed catalog and order requests fail because project tables do not exist.

**Why:** Live runtime verification exposed missing tables while Prisma schema validation and production builds still passed.

**How to apply:** Before testing or deploying database-backed flows in this environment, inspect migration status and apply the existing migrations through the normal Prisma deployment process after confirming the target database and authorization. Do not invent a replacement schema or silently migrate production.