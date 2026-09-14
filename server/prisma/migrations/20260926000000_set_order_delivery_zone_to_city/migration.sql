-- Backfill historical delivery orders so the delivery zone snapshot shows only
-- the specific city the customer chose at checkout. Before this change the
-- snapshot stored the zone's full coverage label (every city/area the zone
-- serves), which made admin/order views list cities the customer never picked.
-- New orders already store the resolved city; this only corrects older rows.
UPDATE "orders"
SET "delivery_zone_name" = "city"
WHERE "fulfillment_method" = 'DELIVERY'
  AND "delivery_zone_name" IS NOT NULL;