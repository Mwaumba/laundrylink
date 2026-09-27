import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PendingApplication =
  Database['public']['Functions']['admin_pending_applications']['Returns'][number];

/**
 * Admin review queue for shops and independent providers.
 * All rules (admin-only, pending-only) are enforced by the Supabase RPCs;
 * this hook only calls them.
 */
export const useApprovalQueue = () => {
  const [items, setItems] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_pending_applications');
    if (error) setError(error.message);
    else {
      setError(null);
      setItems(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const review = useCallback(async (app: PendingApplication, approve: boolean, reason?: string) => {
    const { error } = app.kind === 'provider'
      ? await supabase.rpc('admin_review_provider', { _provider_id: app.id, _approve: approve, _reason: reason })
      : await supabase.rpc('admin_review_vendor', { _vendor_id: app.id, _approve: approve, _reason: reason });
    if (error) throw error;
    setItems((prev) => prev.filter((i) => i.id !== app.id));
  }, []);

  return { items, loading, error, refresh, review };
};
