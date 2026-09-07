---
name: Responsive filter controls
description: The reusable admin filter interaction pattern for desktop and mobile screens with growing filter sets.
---

Use compact anchored quick-filter triggers for the highest-frequency facets, plus one Filters trigger with an icon and active-count badge for the complete set. Keep active filter chips on one horizontally scrollable row, and put the complete filter set in a scrollable sheet with a sticky action footer; on desktop the sheet becomes a right-side panel.

**Why:** Exposing each filter inline makes the toolbar wrap and consume page space as more fields are added, while a quick-filter layer preserves speed for common tasks and a bounded advanced panel keeps the full list manageable on small and large screens.

**How to apply:** Reuse the shared filter components, mark only the most frequent facets as quick filters, and add all fields to grouped advanced-panel configuration. Preserve Clear/Apply actions at the bottom.