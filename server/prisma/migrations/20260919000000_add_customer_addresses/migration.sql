-- Saved delivery addresses belonging to an authenticated customer account.
-- Checkout lets a signed-in customer pick one of these (defaulting to the
-- default address) and, when the customer opts in, save or update an address
-- used for the current order. Owners are always derived from the authenticated
-- customer session — a customer-supplied owner id is never trusted.
CREATE TABLE "customer_addresses" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"       UUID NOT NULL,
    "label"         VARCHAR(60) NOT NULL,
    "recipient_name" VARCHAR(180) NOT NULL,
    "phone"         VARCHAR(40) NOT NULL,
    "address"       VARCHAR(500) NOT NULL,
    "city"          VARCHAR(120) NOT NULL,
    "city_id"       UUID,
    "state"         VARCHAR(120),
    "area_name"     VARCHAR(120),
    "area_id"       UUID,
    "instructions"  VARCHAR(1000),
    "is_default"    BOOLEAN NOT NULL DEFAULT false,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_addresses_user_default_idx"
  ON "customer_addresses"("user_id", "is_default");

CREATE INDEX "customer_addresses_city_id_idx"
  ON "customer_addresses"("city_id");

CREATE INDEX "customer_addresses_area_id_idx"
  ON "customer_addresses"("area_id");

ALTER TABLE "customer_addresses"
  ADD CONSTRAINT "customer_addresses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
