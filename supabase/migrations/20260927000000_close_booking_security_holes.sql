-- =========================================================
-- Close booking / approval security holes
-- (PROJECT_DOCUMENTATION.md §13.1: S1, S2, S3, S4, S5)
--
-- The pattern used throughout: row-level policies decide WHO may touch a
-- row, and BEFORE triggers or column grants decide WHAT they may change.
-- Guards only apply to requests coming from the app (the `anon` and
-- `authenticated` roles). SECURITY DEFINER functions run as the table
-- owner, so the trusted paths below (and the SQL editor / service role)
-- pass through.
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_app_request()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_user IN ('anon', 'authenticated')
$$;

-- ---------- S1: vendors can't approve themselves ----------
CREATE OR REPLACE FUNCTION public.guard_vendor_profile_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_request() OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'New vendor profiles must start as draft' USING ERRCODE = '42501';
    END IF;
    NEW.is_verified     := false;
    NEW.is_featured     := false;
    NEW.rating          := 0;
    NEW.review_count    := 0;
    NEW.profile_views   := 0;
    NEW.favorites_count := 0;
    NEW.inquiries_count := 0;
    RETURN NEW;
  END IF;

  IF NEW.user_id         IS DISTINCT FROM OLD.user_id
  OR NEW.is_verified     IS DISTINCT FROM OLD.is_verified
  OR NEW.is_featured     IS DISTINCT FROM OLD.is_featured
  OR NEW.rating          IS DISTINCT FROM OLD.rating
  OR NEW.review_count    IS DISTINCT FROM OLD.review_count
  OR NEW.profile_views   IS DISTINCT FROM OLD.profile_views
  OR NEW.favorites_count IS DISTINCT FROM OLD.favorites_count
  OR NEW.inquiries_count IS DISTINCT FROM OLD.inquiries_count
  THEN
    RAISE EXCEPTION 'Only admins can change verification, featuring, ratings or counters'
      USING ERRCODE = '42501';
  END IF;

  -- Vendors may submit a draft for review, withdraw a pending submission,
  -- or restart onboarding after a rejection. Approval and rejection are admin-only.
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'draft'    AND NEW.status = 'pending')
    OR (OLD.status = 'pending'  AND NEW.status = 'draft')
    OR (OLD.status = 'rejected' AND NEW.status = 'draft')
  ) THEN
    RAISE EXCEPTION 'Vendors cannot change status from % to %', OLD.status, NEW.status
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_profiles_guard ON public.vendor_profiles;
CREATE TRIGGER trg_vendor_profiles_guard
  BEFORE INSERT OR UPDATE ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_profile_write();

-- ---------- S2: providers can't approve themselves ----------
CREATE OR REPLACE FUNCTION public.guard_provider_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_request() OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'pending_approval') THEN
      RAISE EXCEPTION 'New provider profiles must start as draft or pending_approval'
        USING ERRCODE = '42501';
    END IF;
    NEW.rating         := 0;
    NEW.review_count   := 0;
    NEW.jobs_completed := 0;
    RETURN NEW;
  END IF;

  IF NEW.user_id        IS DISTINCT FROM OLD.user_id
  OR NEW.rating         IS DISTINCT FROM OLD.rating
  OR NEW.review_count   IS DISTINCT FROM OLD.review_count
  OR NEW.jobs_completed IS DISTINCT FROM OLD.jobs_completed
  THEN
    RAISE EXCEPTION 'Only admins can change ratings or job counters' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'draft'            AND NEW.status = 'pending_approval')
    OR (OLD.status = 'pending_approval' AND NEW.status = 'draft')
    OR (OLD.status = 'rejected'         AND NEW.status IN ('draft', 'pending_approval'))
  ) THEN
    RAISE EXCEPTION 'Providers cannot change status from % to %', OLD.status, NEW.status
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_independent_providers_guard ON public.independent_providers;
CREATE TRIGGER trg_independent_providers_guard
  BEFORE INSERT OR UPDATE ON public.independent_providers
  FOR EACH ROW EXECUTE FUNCTION public.guard_provider_write();

-- ---------- S3: booking status only changes through update_booking_status() ----------

-- New bookings always start as a fresh request.
DROP POLICY IF EXISTS "Customers create bookings" ON public.bookings;
CREATE POLICY "Customers create bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id
    AND status = 'requested'
    AND final_price IS NULL
    AND assigned_provider_id IS NULL
    AND accepted_at IS NULL
    AND cancelled_reason IS NULL
  );

-- Direct UPDATEs from the app are limited to the customer editing request
-- details before work starts. Status, price, vendor and assignment are not
-- writable at all from the app; they go through update_booking_status().
REVOKE UPDATE ON public.bookings FROM anon, authenticated;
GRANT UPDATE (
  scheduled_at, address, lat, lng, pickup_required, delivery_required,
  notes, customer_phone, customer_name
) ON public.bookings TO authenticated;

DROP POLICY IF EXISTS "Customers update own bookings" ON public.bookings;
CREATE POLICY "Customers update own bookings" ON public.bookings
  FOR UPDATE
  USING (auth.uid() = customer_id AND status IN ('requested', 'accepted'))
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Vendors update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Providers update assigned bookings" ON public.bookings;

-- History rows are written by the trg_bookings_log_status trigger only (S5).
DROP POLICY IF EXISTS "Authenticated can append history" ON public.booking_status_history;

-- Assigned providers can read the history of their bookings too.
DROP POLICY IF EXISTS "History visible to booking parties" ON public.booking_status_history;
CREATE POLICY "History visible to booking parties" ON public.booking_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_status_history.booking_id
        AND (
          b.customer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.vendor_profiles vp
                     WHERE vp.id = b.vendor_id AND vp.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.independent_providers ip
                     WHERE ip.id = b.assigned_provider_id AND ip.user_id = auth.uid())
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- The one controlled path for booking status changes.
--
-- Who can do what:
--   customer         -> cancelled, only before the items are picked up
--   vendor/provider  -> the next step in the flow below, or cancelled before pickup;
--                       may also set final_price on any non-final step
--   admin            -> any status
--
-- Flow (pickup and delivery steps can be skipped):
--   requested -> accepted -> pickup_scheduled -> picked_up -> in_progress
--             -> ready -> out_for_delivery -> completed
CREATE OR REPLACE FUNCTION public.update_booking_status(
  _booking_id uuid,
  _status booking_status,
  _note text DEFAULT NULL,
  _final_price numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_is_admin boolean;
  v_is_customer boolean;
  v_is_servicer boolean;
  v_allowed booking_status[];
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  v_is_admin    := public.has_role(v_uid, 'admin');
  v_is_customer := v_booking.customer_id = v_uid;
  v_is_servicer := EXISTS (SELECT 1 FROM public.vendor_profiles vp
                           WHERE vp.id = v_booking.vendor_id AND vp.user_id = v_uid)
                OR EXISTS (SELECT 1 FROM public.independent_providers ip
                           WHERE ip.id = v_booking.assigned_provider_id AND ip.user_id = v_uid);

  IF NOT (v_is_admin OR v_is_customer OR v_is_servicer) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  IF _final_price IS NOT NULL AND NOT (v_is_admin OR v_is_servicer) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  IF NOT v_is_admin THEN
    IF v_is_servicer THEN
      v_allowed := CASE v_booking.status
        WHEN 'requested'        THEN ARRAY['accepted', 'cancelled']
        WHEN 'accepted'         THEN ARRAY['pickup_scheduled', 'picked_up', 'in_progress', 'cancelled']
        WHEN 'pickup_scheduled' THEN ARRAY['picked_up', 'cancelled']
        WHEN 'picked_up'        THEN ARRAY['in_progress']
        WHEN 'in_progress'      THEN ARRAY['ready']
        WHEN 'ready'            THEN ARRAY['out_for_delivery', 'completed']
        WHEN 'out_for_delivery' THEN ARRAY['completed']
        ELSE ARRAY[]::text[]
      END::booking_status[];
    ELSE
      v_allowed := CASE
        WHEN v_booking.status IN ('requested', 'accepted', 'pickup_scheduled')
          THEN ARRAY['cancelled']
        ELSE ARRAY[]::text[]
      END::booking_status[];
    END IF;

    IF _status IS DISTINCT FROM v_booking.status AND NOT (_status = ANY (v_allowed)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition',
                                'from', v_booking.status, 'to', _status);
    END IF;

    IF _status = v_booking.status
       AND (_final_price IS NULL OR v_booking.status IN ('completed', 'cancelled')) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition',
                                'from', v_booking.status, 'to', _status);
    END IF;
  END IF;

  UPDATE public.bookings
     SET status = _status,
         final_price = COALESCE(_final_price, final_price),
         cancelled_reason = CASE WHEN _status = 'cancelled'
                                 THEN COALESCE(_note, cancelled_reason)
                                 ELSE cancelled_reason END
   WHERE id = _booking_id;

  -- trg_bookings_log_status has just written the history row; attach the note.
  IF _note IS NOT NULL AND _status IS DISTINCT FROM v_booking.status THEN
    UPDATE public.booking_status_history
       SET note = _note
     WHERE id = (SELECT id FROM public.booking_status_history
                 WHERE booking_id = _booking_id
                 ORDER BY created_at DESC LIMIT 1);
  END IF;

  RETURN jsonb_build_object('ok', true, 'booking_id', _booking_id, 'status', _status);
END;
$$;

REVOKE ALL ON FUNCTION public.update_booking_status(uuid, booking_status, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, booking_status, text, numeric) TO authenticated;

-- ---------- S4: providers only see customer details on jobs they hold ----------
DROP POLICY IF EXISTS "Approved providers see broadcasting requests" ON public.job_requests;
CREATE POLICY "Providers see jobs assigned to them" ON public.job_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.independent_providers ip
            WHERE ip.id = job_requests.assigned_provider_id AND ip.user_id = auth.uid())
  );

-- Open jobs for approved providers, without the customer's name, phone or
-- exact address. Location is rounded to about 1 km.
CREATE OR REPLACE FUNCTION public.list_open_jobs()
RETURNS TABLE (
  id uuid,
  category_id uuid,
  status job_request_status,
  scheduled_at timestamptz,
  approx_lat double precision,
  approx_lng double precision,
  notes text,
  budget numeric,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jr.id, jr.category_id, jr.status, jr.scheduled_at,
         round(jr.lat::numeric, 2)::double precision,
         round(jr.lng::numeric, 2)::double precision,
         jr.notes, jr.budget, jr.expires_at, jr.created_at
    FROM public.job_requests jr
   WHERE jr.status = 'broadcasting'
     AND EXISTS (SELECT 1 FROM public.independent_providers ip
                 WHERE ip.user_id = auth.uid() AND ip.status = 'approved')
   ORDER BY jr.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_open_jobs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_open_jobs() TO authenticated;

-- Offers can only be created by an approved provider for themselves (S5).
DROP POLICY IF EXISTS "Authenticated insert offers" ON public.job_request_offers;
CREATE POLICY "Providers create own offers" ON public.job_request_offers
  FOR INSERT WITH CHECK (
    response = 'pending'
    AND EXISTS (SELECT 1 FROM public.independent_providers ip
                WHERE ip.id = job_request_offers.provider_id
                  AND ip.user_id = auth.uid()
                  AND ip.status = 'approved')
  );

-- accept_job_offer must also refuse providers who are not (or no longer) approved.
CREATE OR REPLACE FUNCTION public.accept_job_offer(_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
  v_job_status job_request_status;
BEGIN
  SELECT o.*, ip.user_id AS provider_user_id, ip.status AS provider_status
    INTO v_offer
  FROM public.job_request_offers o
  JOIN public.independent_providers ip ON ip.id = o.provider_id
  WHERE o.id = _offer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_not_found');
  END IF;

  IF v_offer.provider_user_id <> auth.uid() OR v_offer.provider_status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

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

  UPDATE public.job_requests
     SET status = 'assigned',
         assigned_provider_id = v_offer.provider_id,
         updated_at = now()
   WHERE id = v_offer.job_request_id;

  UPDATE public.job_request_offers
     SET response = 'accepted', responded_at = now()
   WHERE id = _offer_id;

  UPDATE public.job_request_offers
     SET response = 'expired', responded_at = now()
   WHERE job_request_id = v_offer.job_request_id
     AND id <> _offer_id
     AND response = 'pending';

  RETURN jsonb_build_object('ok', true, 'job_request_id', v_offer.job_request_id);
END;
$$;

-- Same idea as bookings for direct job_request updates: the customer can
-- edit details or cancel; the assigned provider can only mark it completed;
-- assignment only happens through accept_job_offer().
CREATE OR REPLACE FUNCTION public.guard_job_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_app_request() OR public.has_role(v_uid, 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
  OR NEW.assigned_provider_id IS DISTINCT FROM OLD.assigned_provider_id
  OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
  THEN
    RAISE EXCEPTION 'Job assignment and expiry cannot be changed directly' USING ERRCODE = '42501';
  END IF;

  IF OLD.customer_id = v_uid THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status IN ('broadcasting', 'assigned') AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'Customers can only cancel a job' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Otherwise the caller is the assigned provider (the only other UPDATE policy).
  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Providers can only change the job status' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'assigned' AND NEW.status = 'completed') THEN
    RAISE EXCEPTION 'Providers can only mark an assigned job completed' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_requests_guard ON public.job_requests;
CREATE TRIGGER trg_job_requests_guard
  BEFORE UPDATE ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_job_request_update();

DROP POLICY IF EXISTS "Customers create job requests" ON public.job_requests;
CREATE POLICY "Customers create job requests" ON public.job_requests
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id
    AND status = 'broadcasting'
    AND assigned_provider_id IS NULL
  );
