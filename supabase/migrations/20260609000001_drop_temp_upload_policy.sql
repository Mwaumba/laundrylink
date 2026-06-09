-- Remove the temporary permissive upload policy used during RLS debugging.
-- The root cause was an unauthenticated Supabase client request (expired session),
-- not a missing policy. The fix is the session guard in handleDocSelect.
DROP POLICY IF EXISTS "temp test upload" ON storage.objects;
