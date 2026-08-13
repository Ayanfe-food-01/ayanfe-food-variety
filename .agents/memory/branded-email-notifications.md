---
name: Branded email notifications
description: Shared transactional email architecture and public URL requirements for future notification work.
---

All transactional emails should use the shared Resend transport and branded HTML template. Order-created notifications are sent only after the database transaction commits, and customer/business deliveries fail independently so email outages cannot undo an order.

**Why:** Email delivery is an external side effect and must not become part of the order transaction's success path; a single visual system also prevents verification, order, and payment emails from drifting apart.

**How to apply:** Reuse the shared email helper for future verification, payment, and order-status messages. Keep `EMAIL_FROM`, `RESEND_API_KEY`, and `BUSINESS_EMAIL` environment-driven, and configure `PUBLIC_APP_URL` to a public HTTPS frontend so email logos and portal links resolve outside local development.