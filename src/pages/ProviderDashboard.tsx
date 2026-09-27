import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, MapPin, Calendar, CheckCircle, Power, Phone, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getCurrentPosition } from '@/lib/geo';

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
  notes: string | null;
  budget: number | null;
  created_at: string;
  category_id: string | null;
  distance_km: number | null;
}

interface MyJob {
  id: string;
  scheduled_at: string | null;
  address: string;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
}

// Jobs this provider has accepted and not finished. Full details are visible
// once assigned.
const fetchMyJobs = async (providerId: string) => {
  const { data } = await supabase
    .from('job_requests')
    .select('id, scheduled_at, address, notes, customer_name, customer_phone')
    .eq('assigned_provider_id', providerId)
    .eq('status', 'assigned')
    .order('scheduled_at', { ascending: true, nullsFirst: false });
  return (data ?? []) as MyJob[];
};

// Open jobs come from list_open_jobs(), which hides the customer's contact
// details and exact address until the provider has accepted the job.
const fetchOpenJobs = async () => {
  const { data } = await supabase.rpc('list_open_jobs');
  return (data ?? []) as JobRow[];
};

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
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

      const [open, mine] = await Promise.all([fetchOpenJobs(), fetchMyJobs(p.id)]);
      setJobs(open);
      setMyJobs(mine);

      setLoading(false);
    };
    load();

    // Providers can no longer read open job rows directly, so realtime
    // changes on job_requests don't reach them; poll instead.
    const interval = setInterval(() => {
      fetchOpenJobs().then(setJobs);
    }, 15000);

    return () => clearInterval(interval);
  }, [navigate]);

  const toggleAvailability = async (next: boolean) => {
    if (!provider) return;
    setOnline(next);
    // Jobs are matched to where the provider is while online, so record it.
    // Without permission we fall back to their base location.
    const position = next ? await getCurrentPosition().catch(() => null) : null;
    if (next && !position) toast.info('Using your base location to find jobs nearby.');
    const { error } = await supabase
      .from('independent_providers')
      .update({
        availability: next ? 'online' : 'offline',
        ...(position ? { current_lat: position.lat, current_lng: position.lng } : {}),
      })
      .eq('id', provider.id);
    if (error) {
      toast.error(error.message);
      setOnline(!next);
      return;
    }
    setJobs(await fetchOpenJobs());
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
      const messages: Record<string, string> = {
        already_assigned: 'Sorry, another provider got it first.',
        job_expired: 'This job has expired.',
      };
      toast.error(messages[result.error ?? ''] ?? 'Could not accept');
      if (result.error === 'already_assigned' || result.error === 'job_expired') {
        setJobs((j) => j.filter((x) => x.id !== jobId));
      }
    } else {
      toast.success('Job accepted!');
      setJobs((j) => j.filter((x) => x.id !== jobId));
      setMyJobs(await fetchMyJobs(provider.id));
    }
  };

  const completeJob = async (jobId: string) => {
    const { error } = await supabase.from('job_requests').update({ status: 'completed' }).eq('id', jobId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Job marked done');
    setMyJobs((j) => j.filter((x) => x.id !== jobId));
    setProvider((p) => (p ? { ...p, jobs_completed: (p.jobs_completed ?? 0) + 1 } : p));
  };

  const releaseJob = async (jobId: string) => {
    if (!window.confirm("Hand this job back? We'll find the customer another provider.")) return;
    const { data, error } = await supabase.rpc('release_job', { _job_id: jobId });
    const result = data as { ok: boolean } | null;
    if (error || !result?.ok) {
      toast.error(error?.message ?? 'Could not hand the job back');
      return;
    }
    toast.success('Job handed back');
    setMyJobs((j) => j.filter((x) => x.id !== jobId));
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

        {myJobs.length > 0 && (
          <>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
              <Briefcase className="h-5 w-5 text-cobalt" /> My Jobs
            </h2>
            <div className="mb-8 space-y-3">
              {myJobs.map((j) => (
                <div key={j.id} className="rounded-xl border border-success/30 bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 space-y-1 text-sm">
                      <p className="font-semibold">{j.customer_name ?? 'Customer'}</p>
                      <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{j.address}</p>
                      {j.scheduled_at && (
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />{new Date(j.scheduled_at).toLocaleString()}
                        </p>
                      )}
                      {j.customer_phone && (
                        <a href={`tel:${j.customer_phone}`} className="inline-flex items-center gap-1 text-cobalt hover:underline">
                          <Phone className="h-3.5 w-3.5" />{j.customer_phone}
                        </a>
                      )}
                      {j.notes && <p className="pt-1">{j.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button onClick={() => completeJob(j.id)} className="gap-1.5">
                        <CheckCircle className="h-4 w-4" /> Mark done
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => releaseJob(j.id)}>
                        Can't make it
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
                        <MapPin className="h-3.5 w-3.5" />
                        {j.distance_km != null ? `${j.distance_km} km away · ` : ''}Exact address shared once you accept
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
