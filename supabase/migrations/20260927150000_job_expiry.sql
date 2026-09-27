-- =========================================================
-- Job expiry (PROJECT_DOCUMENTATION.md §13.2 F7)
--
-- Broadcast jobs carry an expires_at (30 minutes after posting) that nothing
-- enforced: stale jobs stayed open forever and could still be accepted.
--
-- * expire_stale_jobs() marks overdue broadcasting jobs 'expired' and their
--   pending offers 'expired'. pg_cron runs it every minute where available.
-- * list_open_jobs() and accept_job_offer() also check expires_at, so an
--   overdue job is never shown or accepted between cron runs.
-- * The app can't pick its own expiry on insert.
-- * rebroadcast_job() lets the customer post an expired job again.
-- =========================================================

CREATE OR REPLACE FUNCTION public.expire_stale_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.job_requests
       SET status = 'expired', updated_at = now()
     WHERE status = 'broadcasting'
       AND expires_at <= now()
    RETURNING id
  ), offers AS (
    UPDATE public.job_request_offers o
       SET response = 'expired', responded_at = now()
      FROM expired e
     WHERE o.job_request_id = e.id
       AND o.response = 'pending'
  )
  SELECT count(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_jobs() FROM PUBLIC, anon, authenticated;

-- Schedule it every minute. pg_cron is available on Supabase; skip quietly
-- where it isn't (local Postgres without the extension).
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available, expire_stale_jobs() is not scheduled: %', SQLERRM;
    RETURN;
  END;
  PERFORM cron.schedule('expire-stale-jobs', '* * * * *', 'SELECT public.expire_stale_jobs()');
END;
$$;

-- The app can't choose how long its own job stays open.
CREATE OR REPLACE FUNCTION public.set_job_request_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_app_request() AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.expires_at := now() + interval '30 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_requests_set_expiry ON public.job_requests;
CREATE TRIGGER trg_job_requests_set_expiry
  BEFORE INSERT ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_job_request_expiry();

-- Hide overdue jobs even before the cron job has run.
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
     AND jr.expires_at > now()
     AND EXISTS (SELECT 1 FROM public.independent_providers ip
                 WHERE ip.user_id = auth.uid() AND ip.status = 'approved')
   ORDER BY jr.created_at DESC
$$;

-- Refuse overdue jobs, and expire them on the spot.
CREATE OR REPLACE FUNCTION public.accept_job_offer(_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
  v_job record;
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

  SELECT status, expires_at INTO v_job
  FROM public.job_requests
  WHERE id = v_offer.job_request_id
  FOR UPDATE;

  IF v_job.status = 'broadcasting' AND v_job.expires_at <= now() THEN
    UPDATE public.job_requests
       SET status = 'expired', updated_at = now()
     WHERE id = v_offer.job_request_id;
    UPDATE public.job_request_offers
       SET response = 'expired', responded_at = now()
     WHERE job_request_id = v_offer.job_request_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'error', 'job_expired');
  END IF;

  IF v_job.status <> 'broadcasting' THEN
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

-- The customer can post an expired job again for another 30 minutes.
CREATE OR REPLACE FUNCTION public.rebroadcast_job(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
BEGIN
  SELECT customer_id, status INTO v_job
  FROM public.job_requests
  WHERE id = _job_id
  FOR UPDATE;

  IF NOT FOUND OR v_job.customer_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_job.status <> 'expired' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_expired');
  END IF;

  UPDATE public.job_requests
     SET status = 'broadcasting',
         expires_at = now() + interval '30 minutes',
         updated_at = now()
   WHERE id = _job_id;

  RETURN jsonb_build_object('ok', true, 'job_request_id', _job_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rebroadcast_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rebroadcast_job(uuid) TO authenticated;
