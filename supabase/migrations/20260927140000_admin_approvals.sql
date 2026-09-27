-- Admin approvals for shops (vendor_profiles) and independent providers.
--
-- All approval logic lives here so every client (web today, React Native next)
-- calls the same RPCs instead of updating status columns directly:
--   admin_pending_applications()                       -> the review queue
--   admin_review_vendor(_vendor_id, _approve, _reason)   -> approve / reject a shop
--   admin_review_provider(_provider_id, _approve, _reason) -> approve / reject a provider
-- Each function checks has_role(auth.uid(), 'admin') itself, so a non-admin
-- calling them gets an error no matter what the client does.

-- ---------- Review audit columns ----------
ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.independent_providers
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Stamp submitted_at whenever an application enters the pending state, so the
-- queue can be ordered by when it was actually submitted.
CREATE OR REPLACE FUNCTION public.stamp_vendor_submitted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_profiles_submitted_at ON public.vendor_profiles;
CREATE TRIGGER trg_vendor_profiles_submitted_at
  BEFORE INSERT OR UPDATE OF status ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_vendor_submitted_at();

CREATE OR REPLACE FUNCTION public.stamp_provider_submitted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending_approval') THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_independent_providers_submitted_at ON public.independent_providers;
CREATE TRIGGER trg_independent_providers_submitted_at
  BEFORE INSERT OR UPDATE OF status ON public.independent_providers
  FOR EACH ROW EXECUTE FUNCTION public.stamp_provider_submitted_at();

-- Backfill rows already waiting in the queue.
UPDATE public.vendor_profiles SET submitted_at = updated_at
  WHERE status = 'pending' AND submitted_at IS NULL;
UPDATE public.independent_providers SET submitted_at = updated_at
  WHERE status = 'pending_approval' AND submitted_at IS NULL;

-- ---------- Review queue ----------
CREATE OR REPLACE FUNCTION public.admin_pending_applications()
RETURNS TABLE (
  kind text,            -- 'vendor' (shop) or 'provider' (independent)
  id uuid,
  user_id uuid,
  name text,
  category text,        -- vendor_type for shops, 'independent-provider' for providers
  neighborhood text,
  email text,
  phone text,
  submitted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view the approval queue' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT 'vendor'::text, v.id, v.user_id, v.name, v.type::text, v.neighborhood,
           v.email, v.phone, COALESCE(v.submitted_at, v.updated_at)
      FROM public.vendor_profiles v
     WHERE v.status = 'pending'
    UNION ALL
    SELECT 'provider'::text, p.id, p.user_id, p.full_name, 'independent-provider'::text, p.neighborhood,
           NULL::text, p.phone, COALESCE(p.submitted_at, p.updated_at)
      FROM public.independent_providers p
     WHERE p.status = 'pending_approval'
  ) q
  ORDER BY 9 ASC;
END;
$$;

-- ---------- Approve / reject a shop ----------
CREATE OR REPLACE FUNCTION public.admin_review_vendor(
  _vendor_id uuid,
  _approve boolean,
  _reason text DEFAULT NULL
)
RETURNS public.onboarding_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.onboarding_status;
  v_new    public.onboarding_status := CASE WHEN _approve THEN 'approved' ELSE 'rejected' END;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can review shops' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_status FROM public.vendor_profiles WHERE id = _vendor_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Shop is %, not pending review', COALESCE(v_status::text, 'draft') USING ERRCODE = '55000';
  END IF;

  UPDATE public.vendor_profiles
     SET status = v_new,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         rejection_reason = CASE WHEN _approve THEN NULL ELSE NULLIF(btrim(_reason), '') END
   WHERE id = _vendor_id;

  RETURN v_new;
END;
$$;

-- ---------- Approve / reject an independent provider ----------
CREATE OR REPLACE FUNCTION public.admin_review_provider(
  _provider_id uuid,
  _approve boolean,
  _reason text DEFAULT NULL
)
RETURNS public.provider_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.provider_status;
  v_new    public.provider_status := CASE WHEN _approve THEN 'approved' ELSE 'rejected' END;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can review providers' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_status FROM public.independent_providers WHERE id = _provider_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'pending_approval' THEN
    RAISE EXCEPTION 'Provider is %, not pending review', v_status USING ERRCODE = '55000';
  END IF;

  UPDATE public.independent_providers
     SET status = v_new,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         rejection_reason = CASE WHEN _approve THEN NULL ELSE NULLIF(btrim(_reason), '') END
   WHERE id = _provider_id;

  RETURN v_new;
END;
$$;

-- Only signed-in users can call these; the admin check inside does the rest.
REVOKE ALL ON FUNCTION public.admin_pending_applications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_vendor(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_provider(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_pending_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_vendor(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_provider(uuid, boolean, text) TO authenticated;
