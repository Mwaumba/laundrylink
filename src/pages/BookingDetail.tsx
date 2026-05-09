import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Phone, X, Star, Truck, Package, CreditCard, FileText, Sparkles, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookingTimeline, { BookingStatus } from '@/components/BookingTimeline';
import ReviewForm from '@/components/ReviewForm';
import AssignedProviderCard, { AssignedParty } from '@/components/AssignedProviderCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  assigned_provider_id: string | null;
  accepted_at: string | null;
  category_id: string | null;
}

const ASSIGNED_STATUSES: BookingStatus[] = [
  'accepted', 'pickup_scheduled', 'picked_up', 'in_progress', 'ready', 'out_for_delivery', 'completed',
];

const STATUS_TONE: Record<BookingStatus, string> = {
  requested: 'bg-muted text-muted-foreground',
  accepted: 'bg-primary/10 text-primary border-primary/20',
  pickup_scheduled: 'bg-primary/10 text-primary border-primary/20',
  picked_up: 'bg-cobalt/10 text-cobalt border-cobalt/30',
  in_progress: 'bg-cobalt/10 text-cobalt border-cobalt/30',
  ready: 'bg-warning/10 text-warning border-warning/30',
  out_for_delivery: 'bg-cobalt/10 text-cobalt border-cobalt/30',
  completed: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
};

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [vendor, setVendor] = useState<{ name: string; slug: string; phone?: string | null } | null>(null);
  const [category, setCategory] = useState<{ name: string; icon: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReview, setHasReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
      if (error || !data) { setLoading(false); return; }
      setBooking(data as Booking);
      if (data.vendor_id) {
        const { data: v } = await supabase
          .from('vendor_profiles').select('name, slug, phone').eq('id', data.vendor_id).maybeSingle();
        if (v) setVendor(v);
      }
      if (data.category_id) {
        const { data: c } = await supabase
          .from('service_categories').select('name, icon').eq('id', data.category_id).maybeSingle();
        if (c) setCategory(c);
      }
      setLoading(false);
      const { data: existingReview } = await supabase
        .from('reviews').select('id').eq('booking_id', id).maybeSingle();
      if (existingReview) setHasReview(true);
    };
    load();

    const channel = supabase
      .channel(`booking-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        (payload) => setBooking(payload.new as Booking))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const cancel = async () => {
    if (!booking) return;
    const { error } = await supabase
      .from('bookings').update({ status: 'cancelled', cancelled_reason: 'Cancelled by customer' }).eq('id', booking.id);
    if (error) toast.error(error.message);
    else toast.success('Booking cancelled');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl flex-1 space-y-4 px-4 py-8">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-64 rounded-2xl md:col-span-2" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Booking not found</h1>
          <Link to="/bookings" className="mt-4 inline-block text-primary hover:underline">Back to bookings</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const canCancel = !['completed', 'cancelled', 'out_for_delivery'].includes(booking.status);
  const price = booking.final_price ?? booking.estimated_price;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto max-w-5xl flex-1 px-4 py-8"
      >
        <button
          onClick={() => navigate('/bookings')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All bookings
        </button>

        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <div className="pointer-events-none absolute inset-0 gradient-hero opacity-[0.04]" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className={cn('border capitalize', STATUS_TONE[booking.status])}>
                  {booking.status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Created {new Date(booking.created_at).toLocaleDateString()}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                {category?.name ?? 'Service booking'}
              </h1>
              {vendor ? (
                <Link to={`/vendor/${vendor.slug}`} className="mt-1 inline-block text-sm text-primary hover:underline">
                  Provided by {vendor.name}
                </Link>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Awaiting provider assignment</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {vendor?.phone && (
                <a href={`tel:${vendor.phone}`}>
                  <Button variant="outline" size="sm" className="gap-2"><Phone className="h-4 w-4" /> Call</Button>
                </a>
              )}
              {canCancel && (
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={cancel}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left column: timeline + details */}
          <div className="space-y-6 lg:col-span-2">
            <Section icon={<Sparkles className="h-4 w-4" />} title="Status">
              <BookingTimeline status={booking.status} />
            </Section>

            <Section icon={<FileText className="h-4 w-4" />} title="Service details">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailRow label="Service" value={category?.name ?? '—'} />
                <DetailRow label="Pickup" value={booking.pickup_required ? 'Yes' : 'No'} />
                <DetailRow label="Delivery" value={booking.delivery_required ? 'Yes' : 'No'} />
                <DetailRow
                  label="Scheduled"
                  value={booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : 'Flexible'}
                />
              </div>
              {booking.notes && (
                <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">Notes</p>
                  {booking.notes}
                </div>
              )}
            </Section>

            <Section icon={<MapPin className="h-4 w-4" />} title="Location">
              <p className="text-sm text-foreground">{booking.address ?? '—'}</p>
            </Section>

            {booking.status === 'completed' && booking.vendor_id && !hasReview && (
              <ReviewForm
                bookingId={booking.id}
                vendorId={booking.vendor_id}
                defaultName={booking.customer_name ?? ''}
                onSubmitted={() => setHasReview(true)}
              />
            )}
            {booking.status === 'completed' && hasReview && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-warning text-warning" />
                Thanks — your review has been submitted.
              </div>
            )}
          </div>

          {/* Right column: contact + payment */}
          <div className="space-y-6">
            <Section icon={<Phone className="h-4 w-4" />} title="Customer">
              <div className="space-y-2 text-sm">
                <DetailRow label="Name" value={booking.customer_name ?? '—'} />
                <DetailRow label="Phone" value={booking.customer_phone ?? '—'} />
              </div>
            </Section>

            <Section icon={<CreditCard className="h-4 w-4" />} title="Payment">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated</span>
                  <span className="font-medium">{booking.estimated_price ? `KES ${Number(booking.estimated_price).toLocaleString()}` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Final</span>
                  <span className="font-medium">{booking.final_price ? `KES ${Number(booking.final_price).toLocaleString()}` : 'Pending'}</span>
                </div>
                <div className="my-2 h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-lg font-bold text-foreground">
                    {price ? `KES ${Number(price).toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>
            </Section>

            <Section icon={<Truck className="h-4 w-4" />} title="Logistics">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                {booking.pickup_required ? 'Pickup arranged' : 'Drop-off only'}
                <span className="mx-1 text-muted-foreground">·</span>
                {booking.delivery_required ? 'Delivery included' : 'Self collection'}
              </div>
            </Section>
          </div>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};

const Section = ({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
    className="rounded-2xl border border-border bg-card p-6 shadow-card"
  >
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value}</span>
  </div>
);

export default BookingDetail;
