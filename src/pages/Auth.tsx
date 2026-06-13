import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Eye, EyeOff, MailCheck, ArrowLeft, ShoppingBag, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * 🔐 Supabase Auth — required dashboard settings
 *  Authentication → URL Configuration:
 *    Site URL: https://laundrylink2.vercel.app  (production)
 *    Redirect URLs (add ALL of these):
 *      https://laundrylink2.vercel.app
 *      https://laundrylink2.vercel.app/**
 *      https://laundrylink2.vercel.app/auth/callback
 *      http://localhost:5173
 *      http://localhost:5173/**
 *      http://localhost:5173/auth/callback
 *  Authentication → Providers → Email: ENABLED, Confirm email: ON.
 *  We always pass `emailRedirectTo = ${origin}/auth/callback` so verification
 *  links return users to the SAME origin they signed up from (no hardcoded
 *  lovableproject.com domains).
 */

type AccountType = 'customer' | 'vendor';
type Mode = 'login' | 'signup-choose' | 'signup-form';

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialMode: Mode = params.get('mode') === 'signup' ? 'signup-choose' : 'login';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [accountType, setAccountType] = useState<AccountType>('customer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifySent, setVerifySent] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });

  useEffect(() => {
    if (params.get('mode') === 'signup') setMode('signup-choose');
  }, [params]);

  const friendlyError = (msg: string): string => {
    const m = (msg || '').toLowerCase();
    if (m.includes('email not confirmed') || m.includes('not confirmed'))
      return 'Please verify your email before signing in. Check your inbox for the confirmation link.';
    if (m.includes('invalid login') || m.includes('invalid credentials'))
      return 'Email or password is incorrect. If you just signed up, verify your email first.';
    if (m.includes('user already registered'))
      return 'An account with this email already exists. Try signing in instead.';
    if (m.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) {
          console.error('[auth] signIn error:', error);
          throw error;
        }
        toast.success('Welcome back!');
        navigate('/');
      } else {
        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const redirectUrl = `${appUrl}/auth/callback`;
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.fullName, account_type: accountType, role: accountType },
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) {
          console.error('[auth] signUp error:', error);
          throw error;
        }

        if (data.session) {
          toast.success('Account created!');
          navigate(accountType === 'vendor' ? '/vendor/onboarding' : '/bookings');
        } else {
          setVerifySent(form.email.trim());
          toast.success('Check your email to verify your account before signing in.');
        }
      }
    } catch (error: any) {
      toast.error(friendlyError(error?.message ?? 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const socialSoon = () => toast.info('Social sign-in coming soon — use email for now.');

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-auth px-4 py-10">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-cobalt/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-display font-bold text-foreground">
            Laundry<span className="text-gradient-blue">Link</span>
          </span>
        </Link>

        <div className="glass rounded-2xl p-8 shadow-card-hover">
          <AnimatePresence mode="wait">
            {/* ───────── SIGNUP TYPE PICKER ───────── */}
            {mode === 'signup-choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6 text-center">
                  <h1 className="font-display text-2xl font-bold">Create your account</h1>
                  <p className="mt-1 text-sm text-muted-foreground">What brings you to LaundryLink?</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <RoleCard
                    selected={accountType === 'customer'}
                    emoji="🧺"
                    accent="primary"
                    title="I'm a customer"
                    desc="Find vetted cleaners, book pickups, track orders."
                    onClick={() => { setAccountType('customer'); setMode('signup-form'); }}
                  />
                  <RoleCard
                    selected={accountType === 'vendor'}
                    emoji="🏪"
                    accent="amber"
                    title="I'm a vendor"
                    desc="List your laundry business and reach new customers."
                    onClick={() => { setAccountType('vendor'); setMode('signup-form'); }}
                  />
                </div>
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button onClick={() => setMode('login')} className="font-medium text-primary hover:underline">
                    Sign in
                  </button>
                </div>
              </motion.div>
            )}

            {/* ───────── LOGIN / SIGNUP FORM ───────── */}
            {(mode === 'login' || mode === 'signup-form') && (
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                {mode === 'signup-form' && (
                  <button
                    onClick={() => { setMode('signup-choose'); setVerifySent(null); }}
                    className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Change account type
                  </button>
                )}
                <div className="mb-6 text-center">
                  <h1 className="font-display text-2xl font-bold">
                    {mode === 'login' ? 'Welcome back' : accountType === 'vendor' ? 'Create business account' : 'Create your account'}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode === 'login'
                      ? 'Sign in to continue to LaundryLink'
                      : accountType === 'vendor'
                        ? "We'll guide you through listing your business next."
                        : 'Book trusted cleaners across Nairobi.'}
                  </p>
                </div>

                {verifySent && mode === 'signup-form' && (
                  <Alert className="mb-4 border-primary/30 bg-primary/5">
                    <MailCheck className="h-4 w-4 text-primary" />
                    <AlertTitle>Verify your email</AlertTitle>
                    <AlertDescription>
                      We sent a confirmation link to <strong>{verifySent}</strong>. Click it, then sign in.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup-form' && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
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
                      autoComplete="email"
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
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} size="lg">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                  </Button>
                </form>

                {/* Social */}
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  OR
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  <SocialButton onClick={socialSoon} disabled label="Continue with Google" provider="google" />
                  <SocialButton onClick={socialSoon} disabled label="Continue with Apple" provider="apple" />
                </div>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button onClick={() => { setMode('signup-choose'); setVerifySent(null); }} className="font-medium text-primary hover:underline">
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button onClick={() => { setMode('login'); setVerifySent(null); }} className="font-medium text-primary hover:underline">
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

const RoleCard = ({
  emoji, title, desc, onClick, selected, accent,
}: { emoji: string; title: string; desc: string; onClick: () => void; selected?: boolean; accent: 'primary' | 'amber' }) => (
  <button
    onClick={onClick}
    className={cn(
      'group relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-2xl border-2 bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
      selected ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border hover:border-primary/40',
    )}
  >
    <div
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm',
        accent === 'primary' ? 'bg-primary/10' : 'bg-amber/15',
      )}
    >
      {emoji}
    </div>
    <div className="flex-1">
      <p className="font-display text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  </button>
);

const SocialButton = ({
  onClick, disabled, label, provider,
}: { onClick: () => void; disabled?: boolean; label: string; provider: 'google' | 'apple' }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors',
      'hover:bg-secondary',
      disabled && 'cursor-not-allowed opacity-70',
    )}
    aria-disabled={disabled}
  >
    {provider === 'google' ? <GoogleGlyph /> : <AppleGlyph />}
    {label}
    {disabled && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Soon</span>}
  </button>
);

const GoogleGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.2 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.7 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
  </svg>
);

const AppleGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.42 2.21-1.26 3.01-.84.79-1.93 1.27-2.99 1.18-.07-1.07.42-2.18 1.18-2.97.84-.86 2.04-1.4 3.07-1.43v.21zM20.5 17.4c-.55 1.27-.81 1.84-1.52 2.97-.99 1.58-2.39 3.55-4.12 3.56-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.01-3.05-1.79-4.04-3.37C-.07 16.59-.4 11.6 1.34 8.97c1.23-1.86 3.18-2.95 5.01-2.95 1.86 0 3.03 1.02 4.57 1.02 1.49 0 2.4-1.02 4.55-1.02 1.62 0 3.34.88 4.56 2.41-4.01 2.2-3.36 7.93.47 8.97z"/>
  </svg>
);

export default Auth;
