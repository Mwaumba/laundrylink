import { useState } from 'react';
import { CalendarCheck, Clock, MapPin, Phone, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShopBookings, useUpdateShopBooking } from '@/hooks/useShopBookings';
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type ShopBooking,
  isOpenBooking,
  nextShopStatus,
} from '@/lib/api/bookings';

const STATUS_TONE: Partial<Record<BookingStatus, string>> = {
  requested: 'bg-amber/15 text-amber-foreground border-amber/30',
  completed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const formatWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'No time set';

interface ShopBookingsTabProps {
  vendorId: string;
}

const ShopBookingsTab = ({ vendorId }: ShopBookingsTabProps) => {
  const { data: bookings = [], isLoading, isError } = useShopBookings(vendorId);
  const update = useUpdateShopBooking(vendorId);
  const [view, setView] = useState<'open' | 'done'>('open');

  const open = bookings.filter((b) => isOpenBooking(b.status));
  const done = bookings.filter((b) => !isOpenBooking(b.status));
  const shown = view === 'open' ? open : done;

  const move = (b: ShopBooking, status: BookingStatus) =>
    update.mutate(
      { bookingId: b.id, status },
      {
        onSuccess: () => toast.success(status === 'cancelled' ? 'Booking declined' : `Marked ${BOOKING_STATUS_LABELS[status].toLowerCase()}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not update booking'),
      },
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="font-display">Bookings</CardTitle>
          <CardDescription>
            {open.filter((b) => b.status === 'requested').length} new · {open.length} open · {done.length} finished
          </CardDescription>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <Button size="sm" variant={view === 'open' ? 'default' : 'ghost'} onClick={() => setView('open')}>Open</Button>
          <Button size="sm" variant={view === 'done' ? 'default' : 'ghost'} onClick={() => setView('done')}>Finished</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-12 text-center text-muted-foreground">Loading bookings…</p>
        ) : isError ? (
          <p className="py-12 text-center text-destructive">Could not load bookings. Please refresh.</p>
        ) : shown.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 font-medium text-foreground">{view === 'open' ? 'No open bookings' : 'No finished bookings yet'}</p>
            <p className="text-sm text-muted-foreground">New bookings appear here as soon as customers send them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((b) => {
              const next = nextShopStatus(b);
              const busy = update.isPending && update.variables?.bookingId === b.id;
              return (
                <div key={b.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {b.service_categories?.icon} {b.service_categories?.name ?? 'Service'} · {b.customer_name || 'Customer'}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {formatWhen(b.scheduled_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATUS_TONE[b.status] ?? ''}>
                      {BOOKING_STATUS_LABELS[b.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {b.address && (
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {b.address}</span>
                    )}
                    {b.customer_phone && (
                      <a href={`tel:${b.customer_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {b.customer_phone}
                      </a>
                    )}
                    {(b.pickup_required || b.delivery_required) && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" />
                        {[b.pickup_required && 'Pickup', b.delivery_required && 'Delivery'].filter(Boolean).join(' + ')}
                      </span>
                    )}
                  </div>
                  {b.notes && <p className="mt-2 text-sm text-foreground">“{b.notes}”</p>}
                  {b.status === 'cancelled' && b.cancelled_reason && (
                    <p className="mt-2 text-sm text-muted-foreground">Reason: {b.cancelled_reason}</p>
                  )}

                  {next && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => move(b, next.status)}>
                        {next.action}
                      </Button>
                      {b.status === 'requested' && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => move(b, 'cancelled')}>
                          Decline
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShopBookingsTab;
