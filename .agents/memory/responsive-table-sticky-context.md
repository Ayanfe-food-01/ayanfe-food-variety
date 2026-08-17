---
name: Responsive table sticky context
description: Sticky admin table headers must align with their original row while the horizontal scroll proxy remains viewport-positioned.
---

Sticky table headers should be applied to the header row with a viewport-safe top value, not by adding a large top offset to each header cell. Large per-cell offsets can move labels down into the first data row when the surrounding admin header is not part of the sticky containing block. Native scrollbar styling is also inconsistent for centering and rounded ends, so a visually custom rail should sit over a hidden synchronized proxy scroller.

**Why:** Mobile browser previews exposed header labels displaced into product rows and inconsistent native scrollbar geometry.

**How to apply:** Keep one real table scroll container, synchronize any floating control to it, and use shared global scrollbar styling/custom proxy visuals rather than page-specific scrollbar implementations.