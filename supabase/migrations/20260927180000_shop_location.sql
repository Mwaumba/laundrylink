-- =========================================================
-- Shop and provider location (PROJECT_DOCUMENTATION.md §13.2 F14)
--
-- Onboarding never saved lat/lng, so real shops couldn't appear on the map
-- or be matched by distance. The onboarding form now drops a map pin; as a
-- fallback (and for the mobile app), a missing location is filled with the
-- centre of the chosen neighborhood.
-- =========================================================

-- The neighborhoods the app offers (src/data/neighborhoods.ts). Existing rows
-- are left as they are.
INSERT INTO public.neighborhoods (name, slug, lat, lng, description) VALUES
  ('Westlands', 'westlands', -1.2672, 36.8115, 'A major commercial hub with premium laundry services'),
  ('Kilimani', 'kilimani', -1.2892, 36.7856, 'Upscale residential area with quality dry cleaning'),
  ('Kileleshwa', 'kileleshwa', -1.2789, 36.7743, 'Leafy suburb with convenient laundry pickup services'),
  ('Lavington', 'lavington', -1.2812, 36.7635, 'Premium neighborhood with eco-friendly laundry options'),
  ('Karen', 'karen', -1.3187, 36.7112, 'Exclusive area with boutique laundry providers'),
  ('Parklands', 'parklands', -1.2598, 36.8156, 'Diverse neighborhood with affordable laundry services'),
  ('Ngong Road', 'ngong-road', -1.2956, 36.7734, 'Busy corridor with express laundry options'),
  ('South B', 'south-b', -1.3098, 36.8345, 'Residential area with reliable laundry services'),
  ('South C', 'south-c', -1.3156, 36.8234, 'Family-friendly area with quality laundry care'),
  ('Lang''ata', 'langata', -1.3456, 36.7567, 'Suburban area with pickup and delivery laundry'),
  ('Kasarani', 'kasarani', -1.2234, 36.8934, 'Growing area with affordable laundry services'),
  ('Roysambu', 'roysambu', -1.2156, 36.8756, 'Student-friendly area with budget laundry options'),
  ('Embakasi', 'embakasi', -1.3234, 36.8956, 'Large residential area with convenient services'),
  ('Donholm', 'donholm', -1.3012, 36.8756, 'Accessible neighborhood with value laundry services'),
  ('Umoja', 'umoja', -1.2856, 36.8934, 'Community-oriented area with trusted providers'),
  ('Runda', 'runda', -1.2123, 36.8045, 'Exclusive estate with premium laundry care'),
  ('Ruaka', 'ruaka', -1.2034, 36.7823, 'Fast-growing area with modern laundry services')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.valid_lat_lng(_lat double precision, _lng double precision)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (_lat IS NULL AND _lng IS NULL)
      OR (_lat BETWEEN -90 AND 90 AND _lng BETWEEN -180 AND 180)
$$;

CREATE OR REPLACE FUNCTION public.default_vendor_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.lat IS NULL OR NEW.lng IS NULL) AND NEW.neighborhood_slug IS NOT NULL THEN
    SELECT n.lat, n.lng INTO NEW.lat, NEW.lng
      FROM public.neighborhoods n WHERE n.slug = NEW.neighborhood_slug;
  END IF;
  IF NOT public.valid_lat_lng(NEW.lat, NEW.lng) THEN
    RAISE EXCEPTION 'Invalid location' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_profiles_default_location ON public.vendor_profiles;
CREATE TRIGGER trg_vendor_profiles_default_location
  BEFORE INSERT OR UPDATE ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.default_vendor_location();

CREATE OR REPLACE FUNCTION public.default_provider_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.base_lat IS NULL OR NEW.base_lng IS NULL) AND NEW.neighborhood_slug IS NOT NULL THEN
    SELECT n.lat, n.lng INTO NEW.base_lat, NEW.base_lng
      FROM public.neighborhoods n WHERE n.slug = NEW.neighborhood_slug;
  END IF;
  IF NOT public.valid_lat_lng(NEW.base_lat, NEW.base_lng)
  OR NOT public.valid_lat_lng(NEW.current_lat, NEW.current_lng) THEN
    RAISE EXCEPTION 'Invalid location' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_independent_providers_default_location ON public.independent_providers;
CREATE TRIGGER trg_independent_providers_default_location
  BEFORE INSERT OR UPDATE ON public.independent_providers
  FOR EACH ROW EXECUTE FUNCTION public.default_provider_location();

-- Backfill existing rows (runs as the migration owner, so the guards let it through).
UPDATE public.vendor_profiles vp
   SET lat = n.lat, lng = n.lng
  FROM public.neighborhoods n
 WHERE n.slug = vp.neighborhood_slug
   AND (vp.lat IS NULL OR vp.lng IS NULL);

UPDATE public.independent_providers ip
   SET base_lat = n.lat, base_lng = n.lng
  FROM public.neighborhoods n
 WHERE n.slug = ip.neighborhood_slug
   AND (ip.base_lat IS NULL OR ip.base_lng IS NULL);
