import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchApprovedVendors, fetchVendorBySlug } from '@/lib/api/vendors';

export const vendorKeys = {
  all: ['vendors'] as const,
  bySlug: (slug: string) => ['vendors', 'slug', slug] as const,
};

/** Approved vendors from Supabase. */
export function useVendors() {
  return useQuery({
    queryKey: vendorKeys.all,
    queryFn: () => fetchApprovedVendors(supabase),
    staleTime: 60_000,
  });
}

/** One approved vendor by slug; data is null when not found. */
export function useVendor(slug: string | undefined) {
  return useQuery({
    queryKey: vendorKeys.bySlug(slug ?? ''),
    queryFn: () => fetchVendorBySlug(supabase, slug!),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
