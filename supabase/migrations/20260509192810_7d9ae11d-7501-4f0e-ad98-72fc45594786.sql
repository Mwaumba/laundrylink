CREATE OR REPLACE FUNCTION public.stamp_booking_accepted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM NEW.status) AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_stamp_accepted_at ON public.bookings;
CREATE TRIGGER bookings_stamp_accepted_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.stamp_booking_accepted_at();