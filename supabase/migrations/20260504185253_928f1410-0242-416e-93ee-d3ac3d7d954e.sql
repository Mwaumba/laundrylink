-- =========================================================
-- PHASE 1: Cleaning marketplace expansion
-- =========================================================

-- ---------- ENUMS ----------
CREATE TYPE public.booking_status AS ENUM (
  'requested',
  'accepted',
  'pickup_scheduled',
  'picked_up',
  'in_progress',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled'
);

CREATE TYPE public.job_request_status AS ENUM (
  'broadcasting',
  'assigned',
  'completed',
  'cancelled',
  'expired'
);

CREATE TYPE public.job_offer_response AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'expired'
);

CREATE TYPE public.provider_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'suspended'
);

CREATE TYPE public.provider_availability AS ENUM (
  'online',
  'busy',
  'offline'
);

-- Add 'provider' to existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';

-- ---------- SERVICE CATEGORIES ----------
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are public" ON public.service_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins manage categories" ON public.service_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed the 11 categories
INSERT INTO public.service_categories (slug, name, description, icon, sort_order) VALUES
  ('laundry',           'Laundry',                'Wash, dry, fold',                         '🧺', 1),
  ('dry-cleaning',      'Dry Cleaning',           'Professional dry cleaning',               '👔', 2),
  ('ironing',           'Ironing',                'Pressing and ironing only',               '🔥', 3),
  ('mamafua',           'Mamafua / Home Laundry', 'On-demand home laundry service',          '🏠', 4),
  ('house-cleaning',    'House Cleaning',         'Full home cleaning',                      '🧹', 5),
  ('sofa-cleaning',     'Sofa Cleaning',          'Deep sofa and upholstery cleaning',       '🛋️', 6),
  ('carpet-cleaning',   'Carpet Cleaning',        'Carpet shampooing and stain removal',     '🧶', 7),
  ('mattress-cleaning', 'Mattress Cleaning',      'Mattress sanitisation and deep clean',    '🛏️', 8),
  ('office-cleaning',   'Office Cleaning',        'Commercial and office cleaning',          '🏢', 9),
  ('car-interior',      'Car Interior Cleaning',  'Car interior detailing',                  '🚗', 10),
  ('other',             'Other Cleaning Services','Custom cleaning requests',                '✨', 11);

-- ---------- VENDOR ↔ SERVICES LINK ----------
CREATE TABLE public.vendor_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  base_price numeric,
  price_unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, category_id)
);

ALTER TABLE public.vendor_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor services are public" ON public.vendor_services
  FOR SELECT USING (true);

CREATE POLICY "Vendors manage own services" ON public.vendor_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vendor_profiles vp
            WHERE vp.id = vendor_services.vendor_id AND vp.user_id = auth.uid())
  );

CREATE POLICY "Admins manage vendor services" ON public.vendor_services
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ---------- INDEPENDENT PROVIDERS ----------
CREATE TABLE public.independent_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  bio text,
  avatar_url text,
  id_photo_url text,
  neighborhood text,
  neighborhood_slug text,
  service_radius_km integer DEFAULT 5,
  base_lat double precision,
  base_lng double precision,
  current_lat double precision,
  current_lng double precision,
  availability provider_availability NOT NULL DEFAULT 'offline',
  status provider_status NOT NULL DEFAULT 'draft',
  rating double precision DEFAULT 0,
  review_count integer DEFAULT 0,
  jobs_completed integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.independent_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved providers are public" ON public.independent_providers
  FOR SELECT USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users create own provider profile" ON public.independent_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers update own profile" ON public.independent_providers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage providers" ON public.independent_providers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_independent_providers_updated
  BEFORE UPDATE ON public.independent_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Provider services link
CREATE TABLE public.provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.independent_providers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  base_price numeric,
  price_unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, category_id)
);

ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider services are public" ON public.provider_services
  FOR SELECT USING (true);

CREATE POLICY "Providers manage own services" ON public.provider_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.independent_providers ip
            WHERE ip.id = provider_services.provider_id AND ip.user_id = auth.uid())
  );

-- ---------- BOOKINGS (vendor bookings) ----------
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  vendor_id uuid REFERENCES public.vendor_profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  status booking_status NOT NULL DEFAULT 'requested',
  scheduled_at timestamptz,
  address text,
  lat double precision,
  lng double precision,
  pickup_required boolean DEFAULT false,
  delivery_required boolean DEFAULT false,
  notes text,
  estimated_price numeric,
  final_price numeric,
  customer_phone text,
  customer_name text,
  cancelled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Vendors view bookings for their business" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vendor_profiles vp
            WHERE vp.id = bookings.vendor_id AND vp.user_id = auth.uid())
  );

CREATE POLICY "Admins view all bookings" ON public.bookings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Vendors update their bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.vendor_profiles vp
            WHERE vp.id = bookings.vendor_id AND vp.user_id = auth.uid())
  );

CREATE POLICY "Admins manage bookings" ON public.bookings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_vendor   ON public.bookings(vendor_id);
CREATE INDEX idx_bookings_status   ON public.bookings(status);

-- Status history (audit log)
CREATE TABLE public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status booking_status NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History visible to booking parties" ON public.booking_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_status_history.booking_id
        AND (
          b.customer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.vendor_profiles vp
                     WHERE vp.id = b.vendor_id AND vp.user_id = auth.uid())
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Authenticated can append history" ON public.booking_status_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger: auto-log status changes
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_log_status
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

-- ---------- JOB REQUESTS (independent provider broadcast) ----------
CREATE TABLE public.job_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  status job_request_status NOT NULL DEFAULT 'broadcasting',
  scheduled_at timestamptz,
  address text NOT NULL,
  lat double precision,
  lng double precision,
  notes text,
  budget numeric,
  customer_phone text,
  customer_name text,
  assigned_provider_id uuid REFERENCES public.independent_providers(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own job requests" ON public.job_requests
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Approved providers see broadcasting requests" ON public.job_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.independent_providers ip
      WHERE ip.user_id = auth.uid() AND ip.status = 'approved'
    )
  );

CREATE POLICY "Admins view all job requests" ON public.job_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers create job requests" ON public.job_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers update own job requests" ON public.job_requests
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Assigned provider can update" ON public.job_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.independent_providers ip
            WHERE ip.id = job_requests.assigned_provider_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Admins manage job requests" ON public.job_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_job_requests_updated
  BEFORE UPDATE ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_job_requests_status ON public.job_requests(status);
CREATE INDEX idx_job_requests_customer ON public.job_requests(customer_id);

-- Job offers (which providers were offered + their response)
CREATE TABLE public.job_request_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id uuid NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.independent_providers(id) ON DELETE CASCADE,
  response job_offer_response NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  distance_km double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_request_id, provider_id)
);

ALTER TABLE public.job_request_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider sees own offers" ON public.job_request_offers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.independent_providers ip
            WHERE ip.id = job_request_offers.provider_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Customer sees offers on own job" ON public.job_request_offers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.job_requests jr
            WHERE jr.id = job_request_offers.job_request_id AND jr.customer_id = auth.uid())
  );

CREATE POLICY "Admins view all offers" ON public.job_request_offers
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated insert offers" ON public.job_request_offers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Provider responds to own offer" ON public.job_request_offers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.independent_providers ip
            WHERE ip.id = job_request_offers.provider_id AND ip.user_id = auth.uid())
  );

-- First-accept-wins: function to atomically claim a job
CREATE OR REPLACE FUNCTION public.accept_job_offer(_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
  v_provider_id uuid;
  v_job_status job_request_status;
BEGIN
  -- Verify caller owns the offer
  SELECT o.*, ip.user_id AS provider_user_id
    INTO v_offer
  FROM public.job_request_offers o
  JOIN public.independent_providers ip ON ip.id = o.provider_id
  WHERE o.id = _offer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_not_found');
  END IF;

  IF v_offer.provider_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  -- Lock the job row
  SELECT status INTO v_job_status
  FROM public.job_requests
  WHERE id = v_offer.job_request_id
  FOR UPDATE;

  IF v_job_status <> 'broadcasting' THEN
    UPDATE public.job_request_offers
       SET response = 'expired', responded_at = now()
     WHERE id = _offer_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'error', 'already_assigned');
  END IF;

  -- Assign job to this provider
  UPDATE public.job_requests
     SET status = 'assigned',
         assigned_provider_id = v_offer.provider_id,
         updated_at = now()
   WHERE id = v_offer.job_request_id;

  UPDATE public.job_request_offers
     SET response = 'accepted', responded_at = now()
   WHERE id = _offer_id;

  -- Mark all other pending offers as expired
  UPDATE public.job_request_offers
     SET response = 'expired', responded_at = now()
   WHERE job_request_id = v_offer.job_request_id
     AND id <> _offer_id
     AND response = 'pending';

  RETURN jsonb_build_object('ok', true, 'job_request_id', v_offer.job_request_id);
END;
$$;

-- ---------- REVIEWS extension ----------
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.independent_providers(id) ON DELETE SET NULL;

-- Enforce: review requires either a completed booking OR is created by admin
CREATE OR REPLACE FUNCTION public.validate_review_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_id IS NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Reviews must reference a completed booking';
  END IF;

  IF NEW.booking_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = NEW.booking_id
        AND b.customer_id = auth.uid()
        AND b.status = 'completed'
    ) THEN
      RAISE EXCEPTION 'You can only review your own completed bookings';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reviews_validate
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_booking();

-- ---------- REALTIME ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_request_offers;

ALTER TABLE public.bookings           REPLICA IDENTITY FULL;
ALTER TABLE public.job_requests       REPLICA IDENTITY FULL;
ALTER TABLE public.job_request_offers REPLICA IDENTITY FULL;