import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import BookNowButton from '@/components/BookNowButton';

interface Row {
  id: string;
  status: string;
  scheduled_at: string | null;
  address: string | null;
  created_at: string;
  vendor_id: string | null;
  category_id: string | null;
}

const MyBookings = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    };
    load();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="container mx-auto max-w-4xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">My Bookings</h1>
          <BookNowButton />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-cobalt" />
            <p className="font-medium text-foreground">No bookings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Book a service to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Link
                key={r.id}
                to={`/bookings/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-cobalt/40 hover:shadow-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{r.status.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {r.scheduled_at && (
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(r.scheduled_at).toLocaleString()}</span>
                    )}
                    {r.address && (
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.address}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MyBookings;
