---
name: Portable external deployment lockfiles
description: Prevent Replit-only npm package hosts from breaking Vercel or Render clean installs.
---

External deployments cannot resolve Replit's package-firewall registry URLs when those URLs are committed in npm lockfiles.

**Why:** A clean install can fail during dependency installation before Vercel or Render reaches the application build, producing only npm's generic exit-code error.

**How to apply:** Before deploying outside Replit, scan every committed lockfile for `replit.local` or `package-firewall`, regenerate or normalize the lockfiles to public registry URLs, and run the provider's exact clean install command. Tailwind's bundled optional packages may require `npm ci --legacy-peer-deps` in the client deployment.