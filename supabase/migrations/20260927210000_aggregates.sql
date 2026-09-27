-- =========================================================
-- Keep ratings and counters up to date (PROJECT_DOCUMENTATION.md §13.2 F8)
--
-- These columns were shown in the app but nothing ever wrote them:
--   vendor_profiles: rating, review_count, favorites_count, inquiries_count,
--                    profile_views
--   independent_providers: rating, review_count, jobs_completed
--   neighborhoods: vendor_count (approved shops based there)
-- Triggers recount them from the source rows, so they can't drift. The
-- existing guards stop vendors and providers editing them directly.
-- =========================================================

CREATE OR REPLACE FUNCTION public.refresh_vendor_stats(_vendor_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.vendor_profiles vp
     SET rating          = coalesce((SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.vendor_id = vp.id), 0),
         review_count    = (SELECT count(*) FROM public.reviews r WHERE r.vendor_id = vp.id),
         favorites_count = (SELECT count(*) FROM public.favorites f WHERE f.vendor_id = vp.id),
         inquiries_count = (SELECT count(*) FROM public.inquiries i WHERE i.vendor_id = vp.id)
   WHERE vp.id = _vendor_id
$$;

CREATE OR REPLACE FUNCTION public.refresh_provider_stats(_provider_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.independent_providers ip
     SET rating         = coalesce((SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.provider_id = ip.id), 0),
         review_count   = (SELECT count(*) FROM public.reviews r WHERE r.provider_id = ip.id),
         jobs_completed = (SELECT count(*) FROM public.job_requests jr
                            WHERE jr.assigned_provider_id = ip.id AND jr.status = 'completed')
   WHERE ip.id = _provider_id
$$;

CREATE OR REPLACE FUNCTION public.refresh_neighborhood_counts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.neighborhoods n
     SET vendor_count = (SELECT count(*) FROM public.vendor_profiles vp
                          WHERE vp.neighborhood_slug = n.slug AND vp.status = 'approved')
$$;

REVOKE ALL ON FUNCTION public.refresh_vendor_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_provider_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_neighborhood_counts() FROM PUBLIC, anon, authenticated;

-- Reviews, favorites and inquiries: recount the vendor (and provider) touched.
CREATE OR REPLACE FUNCTION public.on_vendor_activity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
BEGIN
  PERFORM public.refresh_vendor_stats(id)
     FROM (SELECT (v_new ->> 'vendor_id')::uuid AS id
           UNION SELECT (v_old ->> 'vendor_id')::uuid) s
    WHERE id IS NOT NULL;

  IF TG_TABLE_NAME = 'reviews' THEN
    PERFORM public.refresh_provider_stats(id)
       FROM (SELECT (v_new ->> 'provider_id')::uuid AS id
             UNION SELECT (v_old ->> 'provider_id')::uuid) s
      WHERE id IS NOT NULL;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_stats ON public.reviews;
CREATE TRIGGER trg_reviews_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.on_vendor_activity_change();

DROP TRIGGER IF EXISTS trg_favorites_stats ON public.favorites;
CREATE TRIGGER trg_favorites_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.on_vendor_activity_change();

DROP TRIGGER IF EXISTS trg_inquiries_stats ON public.inquiries;
CREATE TRIGGER trg_inquiries_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.on_vendor_activity_change();

-- Completed jobs count towards the provider who did them.
CREATE OR REPLACE FUNCTION public.on_job_completion_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status = 'completed') IS DISTINCT FROM (OLD.status = 'completed') THEN
    PERFORM public.refresh_provider_stats(NEW.assigned_provider_id)
     WHERE NEW.assigned_provider_id IS NOT NULL;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_requests_stats ON public.job_requests;
CREATE TRIGGER trg_job_requests_stats
  AFTER UPDATE OF status ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_job_completion_change();

-- Neighborhood shop counts change when a shop is approved, leaves approval,
-- or moves neighborhood.
CREATE OR REPLACE FUNCTION public.on_vendor_listing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE'
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.neighborhood_slug IS DISTINCT FROM OLD.neighborhood_slug THEN
    PERFORM public.refresh_neighborhood_counts();
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_profiles_listing ON public.vendor_profiles;
CREATE TRIGGER trg_vendor_profiles_listing
  AFTER INSERT OR UPDATE OF status, neighborhood_slug OR DELETE ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_vendor_listing_change();

-- Profile views: counted when someone opens an approved shop's page.
CREATE OR REPLACE FUNCTION public.record_vendor_view(_vendor_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.vendor_profiles
     SET profile_views = coalesce(profile_views, 0) + 1
   WHERE id = _vendor_id AND status = 'approved'
     AND user_id IS DISTINCT FROM auth.uid()
$$;

REVOKE ALL ON FUNCTION public.record_vendor_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_vendor_view(uuid) TO anon, authenticated;

-- Bring existing rows up to date.
SELECT public.refresh_vendor_stats(id) FROM public.vendor_profiles;
SELECT public.refresh_provider_stats(id) FROM public.independent_providers;
SELECT public.refresh_neighborhood_counts();
