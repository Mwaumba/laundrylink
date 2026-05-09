import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, MapPin, ArrowRight, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import BookNowButton from '@/components/BookNowButton';

interface Row {
  id: string;
  status: string;
  scheduled_at: string | null;
  address: string | null;
  created_at: string;
  vendor_id: string | null;
  assigned_provider_id: string | null;
  category_id: string | null;
}

interface PartyMap { [id: string]: { name: string; kind: 'vendor' | 'provider' } }

const STATUS_TONE: Record<string, string> = {
  requested: 'bg-warning/15 text-warning border-warning/30',
  pending: 'bg-warning/15 text-warning border-warning/30',
  accepted: 'bg-sky text-sky-foreground border-sky/40',
  in_progress: 'bg-cobalt/15 text-cobalt border-cobalt/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const MyBookings = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [parties, setParties] = useState<PartyMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth?redirect=/bookings');
        return;
      }
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      const list = (data ?? []) as Row[];
      setRows(list);

      // Fetch assigned party names in batch.
      const vendorIds = Array.from(new Set(list.map((r) => r.vendor_id).filter(Boolean) as string[]));
      const providerIds = Array.from(new Set(list.map((r) => r.assigned_provider_id).filter(Boolean) as string[]));
      const map: PartyMap = {};
      if (vendorIds.length) {
        const { data: vs } = await supabase.from('vendor_profiles').select('id, name').in('id', vendorIds);
        (vs ?? []).forEach((v: any) => { map[v.id] = { name: v.name, kind: 'vendor' }; });
      }
      if (providerIds.length) {
        const { data: ps } = await supabase.from('independent_providers').select('id, full_name').in('id', providerIds);
        (ps ?? []).forEach((p: any) => { map[p.id] = { name: p.full_name, kind: 'provider' }; });
      }
      setParties(map);
      setLoading(false);
    };
    load();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero header */}
      <section className="border-b border-border gradient-sky">
        <div className="container mx-auto max-w-5xl px-4 py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-cobalt">Your activity</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-foreground md:text-4xl">My Bookings</h1>
              <p className="mt-1 text-muted-foreground">Track every cleaning request from request to completion.</p>
            </div>
            <BookNowButton />
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl flex-1 px-4 py-8">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-card"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky">
              <Sparkles className="h-7 w-7 text-cobalt" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">No bookings yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Browse vendors or post a quick job — providers nearby will respond fast.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <BookNowButton />
              <Link to="/browse">
                <Button variant="outline">Browse vendors</Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/bookings/${r.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:border-cobalt/40 hover:shadow-card-hover"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky">
                    <Package className="h-5 w-5 text-cobalt" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`capitalize ${STATUS_TONE[r.status] ?? ''}`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {r.scheduled_at && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(r.scheduled_at).toLocaleString()}
                        </span>
                      )}
                      {r.address && (
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5" />
                          {r.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-cobalt" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyBookings;
