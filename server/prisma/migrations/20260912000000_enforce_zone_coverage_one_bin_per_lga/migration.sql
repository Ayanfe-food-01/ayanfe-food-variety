-- Enforces the "one bin per LGA" rule for delivery zones: a single zone may
-- cover an LGA in full (via delivery_zone_cities) OR specific areas of that
-- LGA (via delivery_zone_areas), never both at the same time. This is checked
-- at the database level so the invariant holds no matter which client inserts
-- the rows; the application also validates up front to return a friendly 409.
--
-- SQLSTATE 23505 (unique_violation) is raised so Prisma surfaces it as P2002,
-- which the existing delivery-zone handlers translate into a 409 response.

CREATE OR REPLACE FUNCTION enforce_zone_coverage_one_bin_per_lga()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  overlap_city_id uuid;
  overlap_lga_name text;
BEGIN
  IF TG_TABLE_NAME = 'delivery_zone_cities' THEN
    SELECT a.city_id, c.name
      INTO overlap_city_id, overlap_lga_name
      FROM delivery_zone_areas dza
      JOIN areas a ON a.id = dza.area_id
      JOIN cities c ON c.id = a.city_id
     WHERE dza.delivery_zone_id = NEW.delivery_zone_id
       AND a.city_id = NEW.city_id
     LIMIT 1;
    IF overlap_city_id IS NOT NULL THEN
      RAISE EXCEPTION 'Delivery zone % cannot cover the LGA % in full while a specific area of it is assigned to the same zone (one bin per LGA).', NEW.delivery_zone_id, overlap_lga_name
        USING ERRCODE = '23505';
    END IF;
  ELSIF TG_TABLE_NAME = 'delivery_zone_areas' THEN
    SELECT c.name
      INTO overlap_lga_name
      FROM delivery_zone_cities dzc
      JOIN cities c ON c.id = dzc.city_id
     WHERE dzc.delivery_zone_id = NEW.delivery_zone_id
       AND dzc.city_id = (SELECT a.city_id FROM areas a WHERE a.id = NEW.area_id)
     LIMIT 1;
    IF overlap_lga_name IS NOT NULL THEN
      RAISE EXCEPTION 'Delivery zone % cannot cover a specific area while the LGA % is assigned in full to the same zone (one bin per LGA).', NEW.delivery_zone_id, overlap_lga_name
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_zone_cities_one_bin_per_lga
BEFORE INSERT OR UPDATE ON delivery_zone_cities
FOR EACH ROW EXECUTE FUNCTION enforce_zone_coverage_one_bin_per_lga();

CREATE TRIGGER delivery_zone_areas_one_bin_per_lga
BEFORE INSERT OR UPDATE ON delivery_zone_areas
FOR EACH ROW EXECUTE FUNCTION enforce_zone_coverage_one_bin_per_lga();