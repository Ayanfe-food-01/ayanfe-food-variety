-- Drop the obsolete per-product delivery fee column. Checkout delivery fees
-- are resolved exclusively from the active Delivery Zone that serves the
-- selected location (see orders/checkout.order.ts); this column was never used
-- by zone-based billing and is removed from every product create/update and
-- product response.
ALTER TABLE "products" DROP COLUMN "delivery_fee";