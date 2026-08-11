---
name: Neon migration state
description: Environment constraint for the configured Neon database and existing Prisma migrations.
---

The configured Neon database is synchronized with the repository's existing Prisma migrations. The development runtime must prefer the explicit Neon secret over Replit's injected database URL.

**Why:** Replit can provide a runtime-managed `DATABASE_URL` that points at a different PostgreSQL service; using it in preference to `NEON_DATABASE_URL` makes the API appear healthy while database-backed requests target the wrong database.

**How to apply:** Before testing future database-backed flows, check migration status and confirm the target environment. Apply existing migrations through the normal Prisma deployment process when explicitly requested, then seed only when the development catalog is empty. Do not invent a replacement schema or silently migrate production.