import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, MapPin, Calendar, CheckCircle, Power } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Provider {
  id: string;
  full_name: string;
  status: string;
  availability: string;
  rating: number;
  jobs_completed: number;
}

interface JobRow {
  id: string;
  status: string;
  scheduled_at: string | null;
  address: string;
  notes: string | null;
  budget: number | null;
  created_at: string;
  category_id: string | null;
  customer_name: string | null;
}

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth?redirect=/provider/dashboard');
        return;
      }
      const { data: p } = await supabase
        .from('independent_providers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!p) {
        navigate('/provider/onboarding');
        return;
      }
      setProvider(p as any);
      setOnline(p.availability === 'online');

      const { data: jobData } = await supabase
        .from('job_requests')
        .select('*')
        .eq('status', 'broadcasting')
        .order('created_at', { ascending: false });
      setJobs((jobData ?? []) as JobRow[]);

      setLoading(false);
    };
    load();

    // Realtime: new broadcasting jobs
    const channel = supabase
      .channel('provider-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_requests' },
        () => {
          supabase
            .from('job_requests')
            .select('*')
            .eq('status', 'broadcasting')
            .order('created_at', { ascending: false })
            .then(({ data }) => setJobs((data ?? []) as JobRow[]));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  const toggleAvailability = async (next: boolean) => {
    if (!provider) return;
    setOnline(next);
    const { error } = await supabase
      .from('independent_providers')
      .update({ availability: next ? 'online' : 'offline' })
      .eq('id', provider.id);
    if (error) {
      toast.error(error.message);
      setOnline(!next);
    }
  };

  const acceptJob = async (jobId: string) => {
    if (!provider) return;
    // Insert offer (or get existing) then call accept_job_offer
    const { data: existing } = await supabase
      .from('job_request_offers')
      .select('id')
      .eq('job_request_id', jobId)
      .eq('provider_id', provider.id)
      .maybeSingle();

    let offerId = existing?.id;
    if (!offerId) {
      const { data: newOffer, error: insErr } = await supabase
        .from('job_request_offers')
        .insert({ job_request_id: jobId, provider_id: provider.id })
        .select('id')
        .single();
      if (insErr) {
        toast.error(insErr.message);
        return;
      }
      offerId = newOffer.id;
    }

    const { data, error } = await supabase.rpc('accept_job_offer', { _offer_id: offerId });
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { ok: boolean; error?: string };
    if (!result.ok) {
      toast.error(result.error === 'already_assigned' ? 'Sorry, another provider got it first.' : 'Could not accept');
    } else {
      toast.success('Job accepted!');
      setJobs((j) => j.filter((x) => x.id !== jobId));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="container mx-auto max-w-5xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Provider Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {provider?.full_name}</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
            <Power className={`h-4 w-4 ${online ? 'text-success' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">{online ? 'Online' : 'Offline'}</span>
            <Switch checked={online} onCheckedChange={toggleAvailability} disabled={provider?.status !== 'approved'} />
          </div>
        </div>

        {provider?.status !== 'approved' && (
          <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning-foreground">
            Your profile is <strong>{provider?.status?.replace(/_/g, ' ')}</strong>. You'll be able to accept jobs once approved.
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Jobs completed</p>
            <p className="mt-1 text-2xl font-bold">{provider?.jobs_completed ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Rating</p>
            <p className="mt-1 text-2xl font-bold">{provider?.rating?.toFixed(1) ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Available jobs</p>
            <p className="mt-1 text-2xl font-bold">{jobs.length}</p>
          </div>
        </div>

        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
          <Sparkles className="h-5 w-5 text-cobalt" /> Live Job Feed
        </h2>

        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            No active jobs right now. New requests will appear here in real time.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">New request</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      {j.scheduled_at && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />{new Date(j.scheduled_at).toLocaleString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />{j.address}
                      </span>
                    </div>
                    {j.notes && <p className="mt-2 text-sm">{j.notes}</p>}
                  </div>
                  <Button
                    onClick={() => acceptJob(j.id)}
                    disabled={!online || provider?.status !== 'approved'}
                    className="gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" /> Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ProviderDashboard;
