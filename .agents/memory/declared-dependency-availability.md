---
name: Declared dependency availability
description: Runtime mismatch between package manifests and installed node modules after environment changes.
---

A dependency can be present in package.json and lockfiles while still being absent from node_modules; an import-time module-not-found error must be resolved by restoring the installed dependency before changing application code.

**Why:** Environment/package state can be partially restored, leaving manifests correct but runtime imports broken and causing dependent workflows to fail.

**How to apply:** When a workflow fails with ERR_MODULE_NOT_FOUND, compare the manifest with the installed tree, install the declared version through the project package manager, then restart the affected workflow and rerun typecheck/build.