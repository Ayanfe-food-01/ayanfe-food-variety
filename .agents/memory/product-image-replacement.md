---
name: Product image replacement
description: Safe Cloudinary replacement ordering for product updates.
---

Product image replacement must upload the new asset before updating the product, delete the old asset only after the database update succeeds, and clean up the new asset if persistence fails.

**Why:** This preserves the existing product image when storage or database work fails and prevents orphaned replacement assets where possible.

**How to apply:** Keep image cleanup best-effort after a successful update; never make a product update fail solely because remote deletion failed.