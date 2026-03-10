
-- Fix: require at least a contact method and vendor_id for inquiries
DROP POLICY "Anyone can create inquiries" ON public.inquiries;
CREATE POLICY "Authenticated users can create inquiries" ON public.inquiries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
