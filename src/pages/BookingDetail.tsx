import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Phone, Loader2, X, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookingTimeline, { BookingStatus } from '@/components/BookingTimeline';
import ReviewForm from '@/components/ReviewForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Booking {
  id: string;
  status: BookingStatus;
  scheduled_at: string | null;
  address: string | null;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_required: boolean | null;
  delivery_required: boolean | null;
  estimated_price: number | null;
  final_price: number | null;
  created_at: string;
  vendor_id: string | null;
  category_id: string | null;
}

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [vendor, setVendor] = useState<{ name: string; slug: string } | null>(null);
  const [category, setCategory] = useState<{ name: string; icon: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReview, setHasReview] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setBooking(data as Booking);

      if (data.vendor_id) {
        const { data: v } = await supabase
          .from('vendor_profiles')
          .select('name, slug')
          .eq('id', data.vendor_id)
          .maybeSingle();
        if (v) setVendor(v);
      }
      if (data.category_id) {
        const { data: c } = await supabase
          .from('service_categories')
          .select('name, icon')
          .eq('id', data.category_id)
          .maybeSingle();
        if (c) setCategory(c);
      }
      setLoading(false);

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', id)
        .maybeSingle();
      if (existingReview) setHasReview(true);
    };

    load();

    // Realtime updates
    const channel = supabase
      .channel(`booking-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        (payload) => setBooking(payload.new as Booking),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const cancel = async () => {
    if (!booking) return;
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_reason: 'Cancelled by customer' })
      .eq('id', booking.id);
    if (error) toast.error(error.message);
    else toast.success('Booking cancelled');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Booking not found</h1>
          <Link to="/bookings" className="mt-4 inline-block text-cobalt hover:underline">
            Back to bookings
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const canCancel = !['completed', 'cancelled', 'out_for_delivery'].includes(booking.status);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="container mx-auto max-w-3xl flex-1 px-4 py-8">
        <button onClick={() => navigate('/bookings')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All bookings
        </button>

        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                {category?.icon && <span className="text-2xl">{category.icon}</span>}
                <h1 className="font-display text-2xl font-bold">{category?.name ?? 'Booking'}</h1>
              </div>
              {vendor && (
                <Link to={`/vendor/${vendor.slug}`} className="mt-1 text-sm text-cobalt hover:underline">
                  {vendor.name}
                </Link>
              )}
            </div>
            <Badge variant="outline" className="capitalize">{booking.status.replace(/_/g, ' ')}</Badge>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {booking.scheduled_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {new Date(booking.scheduled_at).toLocaleString()}
              </div>
            )}
            {booking.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {booking.address}
              </div>
            )}
            {booking.customer_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {booking.customer_phone}
              </div>
            )}
          </div>

          {booking.notes && (
            <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{booking.notes}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-semibold">Status</h2>
          <BookingTimeline status={booking.status} />
        </div>

        {canCancel && (
          <Button variant="outline" className="mt-6 gap-2 text-destructive" onClick={cancel}>
            <X className="h-4 w-4" /> Cancel booking
          </Button>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BookingDetail;
