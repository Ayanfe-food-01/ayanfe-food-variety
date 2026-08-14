---
name: Unified authentication
description: Authentication UX and role-separation decision for the storefront.
---

The storefront exposes one public `/login` page for both customers and administrators. Customer signup remains customer-only; the backend user's stored role determines the session cookie, redirect destination, and access.

**Why:** Separate customer modal and admin page created duplicate login experiences and exposed admin language in public navigation.

**How to apply:** Keep role checks and authorization server-side. Extend the single login flow rather than adding role-specific public pages or frontend admin/customer selectors. Admin password changes belong in the protected Settings area.