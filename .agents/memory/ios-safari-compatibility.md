---
name: iOS Safari compatibility boundaries
description: Browser-safe patterns for storefront overlays, viewport sizing, request keys, dates, and iPhone image uploads.
---

Treat mobile overlays as shared resources: coordinate body scroll locking across the navbar and nested modals, preserve scroll position, and include safe-area plus dynamic-viewport padding.

**Why:** iOS Safari changes the visual viewport as browser controls and the keyboard appear, while independent `overflow: hidden` effects can restore the wrong state or strand the page.

**How to apply:** Reuse the shared scroll-lock helper, prefer `svh`/`dvh` with fallbacks, use click/pointer interactions instead of mouse-only dismissal, and keep focus within open dialogs.

Validate uploaded images by binary signature and accept iPhone HEIC/HEIF MIME or extension at both the multipart boundary and storage boundary.

**Why:** iPhone Safari may provide HEIC/HEIF or a generic MIME even when the selected photo is valid; rejecting only JPG/PNG/WEBP breaks ordinary Photos selections.

**How to apply:** Normalize HEIF to HEIC for provider uploads, enforce the verified signature and size limit, and keep user-facing file accept/help text consistent.