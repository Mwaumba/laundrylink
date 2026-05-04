import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';

interface JobRequest {
  id: string;
  status: string;
  scheduled_at: string | null;
  address: string;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  category_id: string | null;
  assigned_provider_id: string | null;
}

const JobRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobRequest | null>(null);
  const [provider, setProvider] = useState<{ full_name: string; phone: string; rating: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase
        .from('job_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (data) {
        setJob(data as JobRequest);
        if (data.assigned_provider_id) {
          const { data: p } = await supabase
            .from('independent_providers')
            .select('full_name, phone, rating')
            .eq('id', data.assigned_provider_id)
            .maybeSingle();
          if (p) setProvider(p);
        }
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`job-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'job_requests', filter: `id=eq.${id}` }, async (payload) => {
        const next = payload.new as JobRequest;
        setJob(next);
        if (next.assigned_provider_id && !provider) {
          const { data: p } = await supabase
            .from('independent_providers')
            .select('full_name, phone, rating')
            .eq('id', next.assigned_provider_id)
            .maybeSingle();
          if (p) setProvider(p);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, provider]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </div>
    );
  }
  if (!job) return null;

  const broadcasting = job.status === 'broadcasting';
  const assigned = job.status === 'assigned';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        <button onClick={() => navigate('/bookings')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">Job Request</h1>
            <Badge variant="outline" className="capitalize">{job.status}</Badge>
          </div>

          {broadcasting && (
            <div className="mb-4 rounded-lg border border-cobalt/30 bg-cobalt/5 p-4 text-sm">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-cobalt" />
              Broadcasting to nearby providers… we'll match you with the first one to accept.
            </div>
          )}

          {assigned && provider && (
            <div className="mb-4 rounded-lg border border-success/30 bg-success/5 p-4">
              <CheckCircle2 className="mb-1 h-5 w-5 text-success" />
              <p className="font-semibold">Matched with {provider.full_name}</p>
              <a href={`tel:${provider.phone}`} className="mt-1 inline-flex items-center gap-1 text-sm text-cobalt hover:underline">
                <Phone className="h-3.5 w-3.5" /> {provider.phone}
              </a>
            </div>
          )}

          <div className="grid gap-3 text-sm">
            {job.scheduled_at && (
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> {new Date(job.scheduled_at).toLocaleString()}</div>
            )}
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {job.address}</div>
            {job.notes && <p className="rounded-md bg-muted p-3 text-muted-foreground">{job.notes}</p>}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JobRequestDetail;
