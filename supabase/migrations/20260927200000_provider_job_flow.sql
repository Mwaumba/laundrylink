-- =========================================================
-- Provider job flow (PROJECT_DOCUMENTATION.md §13.2 F7)
--
-- Providers could accept a job but not hand it back. release_job() lets the
-- assigned provider give up a job before finishing it: it goes back out to
-- other nearby providers for another 30 minutes and the customer is told.
-- The releasing provider doesn't see that job again, and old offers can't be
-- reused to grab it back.
-- (Completing a job was already allowed: the assigned provider may move it
-- from assigned to completed.)
-- =========================================================

CREATE OR REPLACE FUNCTION public.release_job(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
  v_provider_id uuid;
BEGIN
  SELECT jr.status, jr.customer_id, jr.assigned_provider_id INTO v_job
    FROM public.job_requests jr
   WHERE jr.id = _job_id
   FOR UPDATE;

  SELECT ip.id INTO v_provider_id
    FROM public.independent_providers ip
   WHERE ip.user_id = auth.uid();

  IF NOT FOUND OR v_job.assigned_provider_id IS DISTINCT FROM v_provider_id OR v_provider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_job.status <> 'assigned' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_assigned');
  END IF;

  UPDATE public.job_request_offers
     SET response = 'rejected', responded_at = now()
   WHERE job_request_id = _job_id AND provider_id = v_provider_id;

  UPDATE public.job_requests
     SET status = 'broadcasting',
         assigned_provider_id = NULL,
         expires_at = now() + interval '30 minutes',
         updated_at = now()
   WHERE id = _job_id;

  PERFORM public.notify(v_job.customer_id, 'job_released', 'Your provider can''t make it',
    'We''re finding you another provider nearby.', '/jobs/' || _job_id,
    jsonb_build_object('job_request_id', _job_id, 'status', 'broadcasting'));

  RETURN jsonb_build_object('ok', true, 'job_request_id', _job_id);
END;
$$;

REVOKE ALL ON FUNCTION public.release_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_job(uuid) TO authenticated;

-- A rejected offer (e.g. the provider handed the job back) can't be accepted.
-- Expired offers stay usable so a provider can take a reposted job.
CREATE OR REPLACE FUNCTION public.guard_offer_accept()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.response = 'accepted' AND OLD.response = 'rejected' THEN
    RAISE EXCEPTION 'This offer is no longer open' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_request_offers_accept ON public.job_request_offers;
CREATE TRIGGER trg_job_request_offers_accept
  BEFORE UPDATE OF response ON public.job_request_offers
  FOR EACH ROW EXECUTE FUNCTION public.guard_offer_accept();

-- A provider who handed a job back (or whose offer was rejected) isn't
-- matched with it again.
CREATE OR REPLACE FUNCTION public.provider_matches_job(_provider_id uuid, _job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.independent_providers ip
      CROSS JOIN public.job_requests jr
     WHERE ip.id = _provider_id AND jr.id = _job_id
       AND coalesce(public.provider_job_distance_km(ip.id, jr.id) <= coalesce(ip.service_radius_km, 5), true)
       AND (jr.category_id IS NULL
            OR NOT EXISTS (SELECT 1 FROM public.provider_services ps WHERE ps.provider_id = ip.id)
            OR EXISTS (SELECT 1 FROM public.provider_services ps
                        WHERE ps.provider_id = ip.id AND ps.category_id = jr.category_id))
       AND NOT EXISTS (SELECT 1 FROM public.job_request_offers o
                        WHERE o.job_request_id = jr.id AND o.provider_id = ip.id
                          AND o.response = 'rejected')
  )
$$;
