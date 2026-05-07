import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Eye, EyeOff, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * 🔐 Supabase Auth — required dashboard settings
 * (Cloud → Users → Auth Settings)
 *
 *  • Authentication → Providers → Email: ENABLED
 *  • Confirm email: ON (recommended) — users must verify before sign-in
 *  • URL Configuration → Site URL: deployed app URL (or http://localhost:5173 in dev)
 *  • Redirect URLs must include:
 *      - http://localhost:5173
 *      - http://localhost:5173/**
 *      - https://<your-production-domain>
 *      - https://<your-production-domain>/**
 *
 * If "Confirm email" is ON, signUp() will NOT create a session. The user
 * must click the link in their inbox before they can log in. We surface
 * a clear message in that case and never auto-login.
 */

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifySent, setVerifySent] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });

  const friendlyError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes('email not confirmed') || m.includes('not confirmed')) {
      return 'Please verify your email before signing in. Check your inbox for the confirmation link.';
    }
    if (m.includes('invalid login') || m.includes('invalid credentials')) {
      return 'Email or password is incorrect. If you just signed up, verify your email first.';
    }
    if (m.includes('user already registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (m.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) {
          console.error('[auth] signIn error:', error);
          throw error;
        }
        console.log('[auth] signed in:', data.user?.email);
        toast.success('Welcome back!');
        navigate('/');
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.fullName },
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) {
          console.error('[auth] signUp error:', error);
          throw error;
        }

        console.log('[auth] signUp result:', { user: data.user?.id, session: !!data.session });

        // If a session is returned, email confirmation is OFF — user is signed in.
        if (data.session) {
          toast.success('Account created!');
          navigate('/');
        } else {
          // Email confirmation is ON — do NOT auto-login.
          setVerifySent(form.email.trim());
          toast.success('Check your email to verify your account before signing in.');
        }
      }
    } catch (error: any) {
      const message = friendlyError(error?.message ?? 'Something went wrong');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-display font-bold text-foreground">
            Laundry<span className="text-cobalt">Link</span>
          </span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-display">{isLogin ? 'Welcome Back' : 'Create Account'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Sign in to your account' : 'Join LaundryLink Nairobi'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verifySent && !isLogin && (
              <Alert className="mb-4">
                <MailCheck className="h-4 w-4" />
                <AlertTitle>Verify your email</AlertTitle>
                <AlertDescription>
                  We sent a confirmation link to <strong>{verifySent}</strong>. Click it to activate
                  your account, then sign in.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setVerifySent(null);
                }}
                className="font-medium text-primary hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
