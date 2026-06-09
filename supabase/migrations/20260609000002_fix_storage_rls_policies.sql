-- Helper function: checks if the current user owns the vendor profile
-- that matches the first path segment of a storage object.
-- SECURITY DEFINER bypasses nested RLS so this works inside storage policies.
CREATE OR REPLACE FUNCTION public.storage_vendor_owns_path(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendor_profiles
    WHERE vendor_profiles.id::text = (storage.foldername(object_name))[1]
    AND vendor_profiles.user_id = auth.uid()
  )
$$;

-- Drop all existing vendor-docs policies
DROP POLICY IF EXISTS "Vendors can upload own docs" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can read own docs" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can update own docs" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can delete own docs" ON storage.objects;
DROP POLICY IF EXISTS "DEBUG allow all docs" ON storage.objects;

-- Drop all existing vendor-images policies
DROP POLICY IF EXISTS "Vendors can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can read own images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can delete own images" ON storage.objects;

-- vendor-docs policies
CREATE POLICY "Vendors can insert own docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vendor-docs' AND public.storage_vendor_owns_path(name));

CREATE POLICY "Vendors can select own docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vendor-docs' AND public.storage_vendor_owns_path(name));

CREATE POLICY "Vendors can update own docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vendor-docs' AND public.storage_vendor_owns_path(name))
WITH CHECK (bucket_id = 'vendor-docs' AND public.storage_vendor_owns_path(name));

CREATE POLICY "Vendors can delete own docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vendor-docs' AND public.storage_vendor_owns_path(name));

-- vendor-images policies
CREATE POLICY "Vendors can insert own images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vendor-images' AND public.storage_vendor_owns_path(name));

CREATE POLICY "Vendors can select own images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vendor-images' AND public.storage_vendor_owns_path(name));

CREATE POLICY "Vendors can update own images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vendor-images' AND public.storage_vendor_owns_path(name))
WITH CHECK (bucket_id = 'vendor-images' AND public.storage_vendor_owns_path(name));

CREATE POLICY "Vendors can delete own images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vendor-images' AND public.storage_vendor_owns_path(name));

-- Admin read access to docs (already exists but re-creating cleanly)
DROP POLICY IF EXISTS "Admins can read all docs" ON storage.objects;
CREATE POLICY "Admins can read all docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vendor-docs' AND public.has_role(auth.uid(), 'admin'));
