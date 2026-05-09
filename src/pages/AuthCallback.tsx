import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * /auth/callback
 * Handles redirects from Supabase email-verification, magic-link and OAuth flows.
 * Resolves the user's session, picks a destination based on role, and navigates.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const route = async () => {
      // Give Supabase a tick to ingest the URL hash / PKCE code.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? (await supabase.auth.getUser()).data.user;

      if (!user) {
        toast.error('We could not verify your session. Please sign in.');
        navigate('/auth', { replace: true });
        return;
      }

      const [{ data: roles }, { data: vendor }, { data: provider }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('vendor_profiles').select('id, status').eq('user_id', user.id).maybeSingle(),
        supabase.from('independent_providers').select('id, status').eq('user_id', user.id).maybeSingle(),
      ]);

      if (cancelled) return;

      const isAdmin = (roles ?? []).some((r: any) => r.role === 'admin');
      const accountType = (user.user_metadata as any)?.account_type;

      toast.success('Email verified — welcome!');

      if (isAdmin) return navigate('/admin', { replace: true });
      if (vendor) return navigate('/vendor/dashboard', { replace: true });
      if (provider) return navigate('/provider/dashboard', { replace: true });
      if (accountType === 'vendor') return navigate('/vendor/onboarding', { replace: true });
      if (accountType === 'provider') return navigate('/provider/onboarding', { replace: true });
      return navigate('/bookings', { replace: true });
    };

    route();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
};

export default AuthCallback;
