---
name: API workflow port detection
description: A healthy Express API can remain reachable while the managed console workflow is marked failed during port detection.
---

The managed API workflow may report a port timeout even when the Express process is listening on the configured port and direct health requests succeed; a stale watcher may need to be stopped before one clean restart.

**Why:** The workflow health check can fail independently of the process; repeated restarts do not fix a healthy listener and can obscure the actual runtime state. A failed restart can also leave the prior watcher serving the port.

**How to apply:** Check the workflow log, listener address, and `curl` health response before changing application code. If an orphaned watcher remains, stop that process, then restart the configured workflow once. Report platform detection separately from API health.