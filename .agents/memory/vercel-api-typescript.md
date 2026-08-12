---
name: Vercel API TypeScript compatibility
description: TypeScript constraints for API files discovered by Vercel in split frontend deployments.
---

Vercel can type-check API files even when frontend rewrites no longer route traffic to them. Under NodeNext, relative imports in those files must use emitted `.js` extensions, and Node globals need explicit Node typings.

**Why:** An unused legacy API folder can fail or emit deployment diagnostics after the active implementation has moved to static frontend assets.

**How to apply:** Keep discovered API files compiler-clean, use `.js` on relative imports, include Node typings without relying on an unrelated project tsconfig, and validate each possible Vercel project root separately.