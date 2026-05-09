ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS assigned_provider_id uuid,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_bookings_assigned_provider ON public.bookings(assigned_provider_id);

-- Allow approved independent providers to view bookings assigned to them
DROP POLICY IF EXISTS "Providers view assigned bookings" ON public.bookings;
CREATE POLICY "Providers view assigned bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.independent_providers ip
    WHERE ip.id = bookings.assigned_provider_id AND ip.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Providers update assigned bookings" ON public.bookings;
CREATE POLICY "Providers update assigned bookings"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.independent_providers ip
    WHERE ip.id = bookings.assigned_provider_id AND ip.user_id = auth.uid()
  )
);