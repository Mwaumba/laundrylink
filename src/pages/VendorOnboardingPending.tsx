import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface SubmittedSummary {
  businessName?: string;
  businessType?: string;
  neighborhood?: string;
}

const VendorOnboardingPending = () => {
  const location = useLocation();
  const submitted = (location.state as SubmittedSummary | null) ?? {};

  const steps = [
    { label: 'Application received', done: true },
    { label: 'Under admin review', done: false, active: true },
    { label: 'Profile goes live', done: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
        <div className="rounded-3xl bg-card p-8 shadow-md ring-1 ring-border/60 md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber text-amber-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Application submitted — we're reviewing it
            </h1>
            <p className="mt-3 max-w-lg text-muted-foreground">
              Thanks for joining LaundryLink. Our team typically reviews new listings within{' '}
              <strong className="text-foreground">1–2 business days</strong>. You'll get an email the moment your profile goes live.
            </p>
          </div>

          {/* Timeline */}
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.label}
                className={`flex items-center gap-3 rounded-2xl border p-4 ${
                  s.done
                    ? 'border-success/30 bg-success/5'
                    : s.active
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-muted/40'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    s.done
                      ? 'bg-success text-success-foreground'
                      : s.active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.done ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium text-muted-foreground">Step {i + 1}</div>
                  <div className="text-sm font-semibold text-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary card */}
          {(submitted.businessName || submitted.businessType || submitted.neighborhood) && (
            <div className="mt-8 rounded-2xl border border-border bg-secondary/40 p-5">
              <h3 className="font-display text-sm font-semibold text-foreground">What you submitted</h3>
              <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                {submitted.businessName && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Business</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{submitted.businessName}</dd>
                  </div>
                )}
                {submitted.businessType && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Type</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{submitted.businessType}</dd>
                  </div>
                )}
                {submitted.neighborhood && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Neighborhood</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{submitted.neighborhood}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/">
              <Button size="lg" className="rounded-xl bg-primary hover:bg-primary/90">
                Go to Homepage <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="mailto:support@laundrylink.co.ke">
              <Button size="lg" variant="outline" className="rounded-xl gap-2">
                <Mail className="h-4 w-4" /> Contact Support
              </Button>
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default VendorOnboardingPending;
