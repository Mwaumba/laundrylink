-- =========================================================
-- Provider role follows approval (PROJECT_DOCUMENTATION.md §13.2 F5)
--
-- Provider onboarding tried to insert its own 'provider' row in user_roles,
-- which RLS refuses (only admins manage roles), so nobody ever had the role.
-- Now the database grants it when a provider is approved and removes it when
-- they are rejected or suspended.
-- =========================================================

CREATE OR REPLACE FUNCTION public.sync_provider_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'provider')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    DELETE FROM public.user_roles
     WHERE user_id = NEW.user_id AND role = 'provider';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_independent_providers_role ON public.independent_providers;
CREATE TRIGGER trg_independent_providers_role
  AFTER INSERT OR UPDATE OF status ON public.independent_providers
  FOR EACH ROW EXECUTE FUNCTION public.sync_provider_role();

-- Providers approved before this migration.
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'provider' FROM public.independent_providers WHERE status = 'approved'
ON CONFLICT (user_id, role) DO NOTHING;
