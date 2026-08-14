---
name: Prisma client freshness
description: Generated Prisma client consistency after schema changes in the server workflow.
---

When the Prisma schema gains enums or fields, the API can keep loading an older generated client until `prisma generate` runs and the API workflow restarts.

**Why:** A stale generated client caused both TypeScript failures and an API startup error even though the schema itself was valid.

**How to apply:** Run the server Prisma generation/build step, restart the API workflow, then rerun typecheck and runtime health checks.