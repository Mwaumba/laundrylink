import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'guest' | 'customer' | 'vendor' | 'admin';

interface RoleState {
  role: UserRole;
  userId: string | null;
  loading: boolean;
}

/**
 * Determines the user's effective role.
 * Priority: admin > vendor (has vendor_profile) > customer (logged in) > guest.
 */
export const useUserRole = (): RoleState => {
  const [state, setState] = useState<RoleState>({ role: 'guest', userId: null, loading: true });

  useEffect(() => {
    let active = true;

    const resolve = async (userId: string | null) => {
      if (!userId) {
        if (active) setState({ role: 'guest', userId: null, loading: false });
        return;
      }
      const [{ data: roles }, { data: vendor }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('vendor_profiles').select('id').eq('user_id', userId).maybeSingle(),
      ]);
      const isAdmin = (roles ?? []).some((r: any) => r.role === 'admin');
      const role: UserRole = isAdmin ? 'admin' : vendor ? 'vendor' : 'customer';
      if (active) setState({ role, userId, loading: false });
    };

    supabase.auth.getUser().then(({ data }) => resolve(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      resolve(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
};
