---
name: Database migration state
description: Environment constraint for the configured PostgreSQL database and existing Prisma migrations.
---

The configured PostgreSQL database is synchronized with the repository's existing Prisma migrations. The development runtime must use the workspace's explicitly configured `DATABASE_URL`, and deployment environments may provide their own value for the same variable.

**Why:** Database-backed requests can appear healthy while targeting an unintended PostgreSQL service if the runtime selects an implicit or stale connection instead of the explicitly configured workspace database.

**How to apply:** Before testing future database-backed flows, check migration status and confirm the target environment. Apply existing migrations through the normal Prisma deployment process when explicitly requested, then seed only when the development catalog is empty. Restart stale API watchers after secret or database-target changes before testing auth. Do not invent a replacement schema or silently migrate production.

Prisma migration deployment can also time out on Neon’s advisory lock if a diagnostic `psql` session remains open through the pooler. Close the diagnostic session before retrying; do not reset the database or bypass migration tracking.

**Why:** A read-only lock inspection session can itself hold the advisory lock while Prisma waits, making a healthy database look like a migration failure.

**How to apply:** If `prisma migrate deploy` reports P1002 on `pg_advisory_lock`, stop stale app/migration clients, inspect briefly, close every diagnostic connection, and retry the normal migration command.