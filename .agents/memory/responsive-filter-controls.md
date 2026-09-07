---
name: Responsive filter controls
description: The reusable admin filter interaction pattern for desktop and mobile screens with growing filter sets.
---

Use one compact Filters trigger with an icon and active-count badge instead of exposing every filter inline. Keep active filter chips on one horizontally scrollable row, and put the complete filter set in a scrollable sheet with a sticky action footer; on desktop the sheet becomes a right-side panel.

**Why:** Exposing each filter inline makes the toolbar wrap and consume page space as more fields are added, while a bounded sheet keeps the list manageable on small and large screens.

**How to apply:** Reuse the shared filter components and add new fields to the sheet configuration. Prefer grouped fields for larger sets and preserve Clear/Apply actions at the bottom.