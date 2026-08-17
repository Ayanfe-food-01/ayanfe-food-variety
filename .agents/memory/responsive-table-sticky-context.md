---
name: Responsive table sticky context
description: Admin tables use normal synchronized columns, with only the header row remaining vertically accessible while the horizontal scroll proxy stays viewport-positioned.
---

Admin table columns should scroll together as normal cells; do not make identifier columns sticky or add a visual rail/shadow that splits them from the rest of the table. If vertical header access is needed, apply stickiness to the complete header row with a viewport-safe top value, not to individual header cells. Native scrollbar styling is inconsistent for centering and rounded ends, so a visually custom rail should sit over a hidden synchronized proxy scroller. Desktop tables should use generous minimum widths and no-wrap content so columns do not compress into unreadable strips.

**Why:** Mobile browser previews exposed header labels displaced into product rows, sticky-column split styling looked incorrect, and narrow table minimum widths compressed readable content.

**How to apply:** Keep one real table scroll container, synchronize any floating control to it, keep all desktop columns in the same scroll flow, and use shared global scrollbar styling/custom proxy visuals rather than page-specific scrollbar implementations.