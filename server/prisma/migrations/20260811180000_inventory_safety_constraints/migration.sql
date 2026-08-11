ALTER TABLE "customer_cart_items"
ADD CONSTRAINT "customer_cart_items_quantity_check"
CHECK ("quantity" >= 1 AND "quantity" <= 1000);