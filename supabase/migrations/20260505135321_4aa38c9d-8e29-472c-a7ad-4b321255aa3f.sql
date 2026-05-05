-- Support ticket status enum
DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users view own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tickets"
ON public.support_tickets FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_support_tickets_updated
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();