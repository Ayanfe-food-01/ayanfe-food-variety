---
name: Unified authentication
description: Authentication UX and role-separation decision for the storefront.
---

The storefront exposes one public `/login` page for both customers and administrators. Customer signup remains customer-only; the backend user's stored role determines the session cookie, redirect destination, and access.

**Why:** Separate customer modal and admin page created duplicate login experiences and exposed admin language in public navigation.

**How to apply:** Keep role checks and authorization server-side. Extend the single login flow rather than adding role-specific public pages or frontend admin/customer selectors. Admin password changes belong in the protected Settings area.

Google OIDC sign-in belongs in the same customer session architecture. A verified Google email may safely link to an existing customer account, but Google sign-in must reject admin accounts and mismatched existing Google identities.

**Why:** This preserves one account per verified email without giving the public OAuth flow a path to create or access administrator sessions.

**How to apply:** Validate Google issuer, audience, signature, email verification, nonce, and OAuth state server-side before creating or linking a customer.