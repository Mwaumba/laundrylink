-- =========================================================
-- In-app notifications (PROJECT_DOCUMENTATION.md §13.2 F10)
--
-- A per-user inbox written only by database triggers, so the web app and
-- the mobile app get the same alerts without any client code creating them:
--   * shops: new booking, booking cancelled by the customer
--   * customers: booking status changes, job accepted / expired / completed
--   * providers: new matching job nearby, job cancelled by the customer
--   * shops and providers: application approved or rejected
-- Clients read their rows (realtime is on) and may only set read_at.
-- Push/SMS delivery can later read from this table (e.g. a webhook on
-- insert calling an Edge Function).
-- =========================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Only read_at can be changed from the app; nothing can be inserted or deleted.
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify(
  _user_id uuid, _kind text, _title text, _body text, _link text, _data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, kind, title, body, link, data)
  SELECT _user_id, _kind, _title, _body, _link, coalesce(_data, '{}'::jsonb)
   WHERE _user_id IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.notify(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.booking_status_label(_status booking_status)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _status
    WHEN 'requested'        THEN 'requested'
    WHEN 'accepted'         THEN 'accepted'
    WHEN 'pickup_scheduled' THEN 'scheduled for pickup'
    WHEN 'picked_up'        THEN 'picked up'
    WHEN 'in_progress'      THEN 'being cleaned'
    WHEN 'ready'            THEN 'ready'
    WHEN 'out_for_delivery' THEN 'out for delivery'
    WHEN 'completed'        THEN 'completed'
    WHEN 'cancelled'        THEN 'cancelled'
  END
$$;

-- ---------- Bookings ----------
CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_owner uuid;
  v_shop_name text;
  v_link text := '/bookings/' || NEW.id;
  v_data jsonb := jsonb_build_object('booking_id', NEW.id, 'status', NEW.status);
BEGIN
  SELECT vp.user_id, vp.name INTO v_shop_owner, v_shop_name
    FROM public.vendor_profiles vp WHERE vp.id = NEW.vendor_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(v_shop_owner, 'booking_new', 'New booking request',
      coalesce(NEW.customer_name, 'A customer') || ' wants to book you.', v_link, v_data);
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- The customer hears about every change they didn't make themselves.
  IF auth.uid() IS DISTINCT FROM NEW.customer_id THEN
    PERFORM public.notify(NEW.customer_id, 'booking_status',
      'Your booking is ' || public.booking_status_label(NEW.status),
      CASE WHEN v_shop_name IS NOT NULL THEN 'Update from ' || v_shop_name || '.' END,
      v_link, v_data);
  END IF;

  -- The shop hears when the customer cancels.
  IF NEW.status = 'cancelled' AND auth.uid() = NEW.customer_id THEN
    PERFORM public.notify(v_shop_owner, 'booking_cancelled', 'Booking cancelled',
      coalesce(NEW.customer_name, 'The customer') || ' cancelled their booking.', v_link, v_data);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_notify ON public.bookings;
CREATE TRIGGER trg_bookings_notify
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

-- ---------- Broadcast jobs ----------
CREATE OR REPLACE FUNCTION public.notify_job_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text := '/jobs/' || NEW.id;
  v_data jsonb := jsonb_build_object('job_request_id', NEW.id, 'status', NEW.status);
  v_provider_user uuid;
BEGIN
  -- New (or reposted) job: tell matching providers who are online.
  IF NEW.status = 'broadcasting'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'broadcasting') THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    SELECT ip.user_id, 'job_nearby', 'New job near you',
           coalesce(round(public.provider_job_distance_km(ip.id, NEW.id)::numeric, 1) || ' km away. ', '')
             || 'Accept it before someone else does.',
           '/provider/dashboard', v_data
      FROM public.independent_providers ip
     WHERE ip.status = 'approved'
       AND ip.availability = 'online'
       AND public.provider_matches_job(ip.id, NEW.id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_provider_user
    FROM public.independent_providers WHERE id = NEW.assigned_provider_id;

  CASE NEW.status
    WHEN 'assigned' THEN
      PERFORM public.notify(NEW.customer_id, 'job_assigned', 'A provider accepted your job',
        'Open the job to see who is coming and call them.', v_link, v_data);
    WHEN 'expired' THEN
      PERFORM public.notify(NEW.customer_id, 'job_expired', 'No provider took your job',
        'You can post it again.', v_link, v_data);
    WHEN 'completed' THEN
      IF auth.uid() IS DISTINCT FROM NEW.customer_id THEN
        PERFORM public.notify(NEW.customer_id, 'job_completed', 'Your job is done', NULL, v_link, v_data);
      END IF;
    WHEN 'cancelled' THEN
      IF auth.uid() IS DISTINCT FROM v_provider_user THEN
        PERFORM public.notify(v_provider_user, 'job_cancelled', 'Job cancelled',
          'The customer cancelled this job.', v_link, v_data);
      END IF;
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_requests_notify ON public.job_requests;
CREATE TRIGGER trg_job_requests_notify
  AFTER INSERT OR UPDATE OF status ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_job_change();

-- ---------- Applications ----------
CREATE OR REPLACE FUNCTION public.notify_vendor_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.notify(NEW.user_id, 'application_approved', 'Your shop is approved',
        NEW.name || ' is now live on Laundry Link.', '/vendor/dashboard',
        jsonb_build_object('vendor_id', NEW.id));
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify(NEW.user_id, 'application_rejected', 'Your shop application needs changes',
        to_jsonb(NEW) ->> 'rejection_reason', '/vendor/onboarding',
        jsonb_build_object('vendor_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_profiles_notify ON public.vendor_profiles;
CREATE TRIGGER trg_vendor_profiles_notify
  AFTER UPDATE OF status ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_vendor_review();

CREATE OR REPLACE FUNCTION public.notify_provider_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.notify(NEW.user_id, 'application_approved', 'You''re approved',
        'Go online to start receiving jobs near you.', '/provider/dashboard',
        jsonb_build_object('provider_id', NEW.id));
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify(NEW.user_id, 'application_rejected', 'Your provider application needs changes',
        to_jsonb(NEW) ->> 'rejection_reason', '/provider/onboarding',
        jsonb_build_object('provider_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_independent_providers_notify ON public.independent_providers;
CREATE TRIGGER trg_independent_providers_notify
  AFTER UPDATE OF status ON public.independent_providers
  FOR EACH ROW EXECUTE FUNCTION public.notify_provider_review();
