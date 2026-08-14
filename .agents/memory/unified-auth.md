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

New Google customer accounts still pass through the app's email-verification step before any customer session is created. Existing verified customer accounts may link their matching Google identity and sign in immediately; existing unverified customer accounts reuse the one pending verification record instead of creating another.

**Why:** Google validates the provider identity, while the storefront's own verification gate keeps signup behavior consistent and prevents duplicate active verification codes or pre-verification sessions.

**How to apply:** Route pending Google signups to `/verify-email`; only the normal verification endpoint can make the customer eligible for a session.