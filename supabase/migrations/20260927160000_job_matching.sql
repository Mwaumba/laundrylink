-- =========================================================
-- Match broadcast jobs to nearby providers (PROJECT_DOCUMENTATION.md §13.2 F7)
--
-- Every approved provider used to see every open job in Nairobi. Now a
-- provider only sees (and can only accept) jobs that:
--   * are within their service radius of where they are (current location
--     while online, otherwise their base, otherwise their neighborhood), and
--   * are in a service category they offer (if they listed any).
-- When the job or the provider has no location yet, distance can't rule the
-- job out, so it is still shown, with no distance.
-- =========================================================

-- Great-circle distance in km (haversine). No PostGIS needed.
CREATE OR REPLACE FUNCTION public.distance_km(
  _lat1 double precision, _lng1 double precision,
  _lat2 double precision, _lng2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN _lat1 IS NULL OR _lng1 IS NULL OR _lat2 IS NULL OR _lng2 IS NULL THEN NULL
  ELSE 6371 * 2 * asin(sqrt(
         power(sin(radians(_lat2 - _lat1) / 2), 2)
       + cos(radians(_lat1)) * cos(radians(_lat2)) * power(sin(radians(_lng2 - _lng1) / 2), 2)
       ))
  END
$$;

-- Distance from a provider to a job, or NULL when either location is unknown.
CREATE OR REPLACE FUNCTION public.provider_job_distance_km(_provider_id uuid, _job_id uuid)
RETURNS double precision
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.distance_km(
           coalesce(CASE WHEN ip.availability = 'online' THEN ip.current_lat END, ip.base_lat, n.lat),
           coalesce(CASE WHEN ip.availability = 'online' THEN ip.current_lng END, ip.base_lng, n.lng),
           jr.lat, jr.lng)
    FROM public.independent_providers ip
    CROSS JOIN public.job_requests jr
    LEFT JOIN public.neighborhoods n ON n.slug = ip.neighborhood_slug
   WHERE ip.id = _provider_id AND jr.id = _job_id
$$;

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
  )
$$;

REVOKE ALL ON FUNCTION public.provider_job_distance_km(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provider_matches_job(uuid, uuid) FROM PUBLIC, anon;
-- Used by the offers insert policy, which runs as the caller. Only returns a yes/no.
GRANT EXECUTE ON FUNCTION public.provider_matches_job(uuid, uuid) TO authenticated;

-- The return type gains distance_km, so the function has to be recreated.
DROP FUNCTION IF EXISTS public.list_open_jobs();
CREATE FUNCTION public.list_open_jobs()
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
  created_at timestamptz,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jr.id, jr.category_id, jr.status, jr.scheduled_at,
         round(jr.lat::numeric, 2)::double precision,
         round(jr.lng::numeric, 2)::double precision,
         jr.notes, jr.budget, jr.expires_at, jr.created_at,
         round(public.provider_job_distance_km(ip.id, jr.id)::numeric, 1)::double precision AS distance_km
    FROM public.independent_providers ip
    JOIN public.job_requests jr
      ON jr.status = 'broadcasting'
     AND jr.expires_at > now()
     AND public.provider_matches_job(ip.id, jr.id)
   WHERE ip.user_id = auth.uid()
     AND ip.status = 'approved'
   ORDER BY distance_km NULLS LAST, jr.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_open_jobs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_open_jobs() TO authenticated;

-- A provider can only make an offer on a job they were matched with.
DROP POLICY IF EXISTS "Providers create own offers" ON public.job_request_offers;
CREATE POLICY "Providers create own offers" ON public.job_request_offers
  FOR INSERT WITH CHECK (
    response = 'pending'
    AND EXISTS (SELECT 1 FROM public.independent_providers ip
                WHERE ip.id = job_request_offers.provider_id
                  AND ip.user_id = auth.uid()
                  AND ip.status = 'approved')
    AND public.provider_matches_job(provider_id, job_request_id)
  );
