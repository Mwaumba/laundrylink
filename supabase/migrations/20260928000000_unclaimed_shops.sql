-- =========================================================
-- Unclaimed shop listings
--
-- An admin can list a real shop before its owner has an account (imported
-- with user_id NULL). Such a listing shows on the map and in search, but it
-- cannot take bookings, because nobody could accept them. Once the owner
-- creates an account, assign_shop_owner() hands the listing to them and it
-- becomes bookable like any other shop.
-- =========================================================

-- Public flag so clients can tell listings apart without reading user_id.
ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS is_claimed boolean GENERATED ALWAYS AS (user_id IS NOT NULL) STORED;

-- ---------- No bookings for shops without an owner ----------
CREATE OR REPLACE FUNCTION public.guard_booking_vendor_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.vendor_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.vendor_profiles
        WHERE id = NEW.vendor_id AND user_id IS NULL
     ) THEN
    RAISE EXCEPTION 'This shop is not taking bookings through Laundry Link yet. Please contact them directly.'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_vendor_claimed ON public.bookings;
CREATE TRIGGER trg_bookings_vendor_claimed
  BEFORE INSERT OR UPDATE OF vendor_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_vendor_claimed();

-- ---------- Hand a listing to its owner ----------
-- Callable by an admin from the app, or from the Supabase SQL editor:
--   SELECT public.assign_shop_owner('<shop id>', 'owner@example.com');
CREATE OR REPLACE FUNCTION public.assign_shop_owner(_vendor_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner  uuid;
  v_user   uuid;
BEGIN
  -- Inside SECURITY DEFINER current_user is the owner, so is_app_request()
  -- can't tell who called. App calls always carry a signed-in user (anon can't
  -- execute this); the SQL editor has none.
  IF (auth.uid() IS NOT NULL OR session_user = 'authenticator')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign shop owners' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO v_owner FROM public.vendor_profiles WHERE id = _vendor_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner IS NOT NULL THEN
    RAISE EXCEPTION 'This shop already has an owner' USING ERRCODE = '55000';
  END IF;

  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(_email));
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No account with email %. Ask the owner to sign up first.', _email
      USING ERRCODE = 'P0002';
  END IF;

  -- The app assumes one shop per account. A draft left over from starting
  -- onboarding is removed; any other shop blocks the hand-over.
  IF EXISTS (SELECT 1 FROM public.vendor_profiles
              WHERE user_id = v_user AND status IS DISTINCT FROM 'draft') THEN
    RAISE EXCEPTION 'That account already has a shop. Reject or remove it first.'
      USING ERRCODE = '55000';
  END IF;
  DELETE FROM public.vendor_profiles WHERE user_id = v_user AND status IS NOT DISTINCT FROM 'draft';

  UPDATE public.vendor_profiles SET user_id = v_user WHERE id = _vendor_id;
  RETURN v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_shop_owner(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_shop_owner(uuid, text) TO authenticated;
