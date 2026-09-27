// Booking data access for shops. Plain async functions with no DOM or React
// imports so they can be shared with the React Native app.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/integrations/supabase/types';

type Client = SupabaseClient<Database>;

export type BookingStatus = Database['public']['Enums']['booking_status'];

export type ShopBooking = Tables<'bookings'> & {
  service_categories: { name: string; icon: string | null } | null;
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: 'New request',
  accepted: 'Accepted',
  pickup_scheduled: 'Pickup scheduled',
  picked_up: 'Picked up',
  in_progress: 'In progress',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * The next step a shop can move a booking to, or null when the booking is
 * finished. Pickup and delivery steps are skipped when the customer did not ask
 * for them. Declining a new request is handled separately (see declineBooking).
 */
export function nextShopStatus(
  b: Pick<Tables<'bookings'>, 'status' | 'pickup_required' | 'delivery_required'>,
): { status: BookingStatus; action: string } | null {
  switch (b.status) {
    case 'requested':
      return { status: 'accepted', action: 'Accept' };
    case 'accepted':
      return b.pickup_required
        ? { status: 'pickup_scheduled', action: 'Schedule pickup' }
        : { status: 'in_progress', action: 'Start cleaning' };
    case 'pickup_scheduled':
      return { status: 'picked_up', action: 'Mark picked up' };
    case 'picked_up':
      return { status: 'in_progress', action: 'Start cleaning' };
    case 'in_progress':
      return { status: 'ready', action: 'Mark ready' };
    case 'ready':
      return b.delivery_required
        ? { status: 'out_for_delivery', action: 'Send for delivery' }
        : { status: 'completed', action: 'Mark collected' };
    case 'out_for_delivery':
      return { status: 'completed', action: 'Mark delivered' };
    default:
      return null;
  }
}

export function isOpenBooking(status: BookingStatus): boolean {
  return status !== 'completed' && status !== 'cancelled';
}

/** Every booking for a shop, newest first, with its service name. */
export async function fetchShopBookings(client: Client, vendorId: string): Promise<ShopBooking[]> {
  const { data, error } = await client
    .from('bookings')
    .select('*, service_categories(name, icon)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShopBooking[];
}

/**
 * Moves a booking to a new status through the update_booking_status RPC, which
 * checks the caller and the allowed transitions. For 'cancelled', note is saved
 * as the cancellation reason. Falls back to a direct update while the RPC is
 * not deployed yet.
 */
async function changeStatus(client: Client, bookingId: string, status: BookingStatus, note?: string): Promise<void> {
  // The RPC is newer than the generated types, hence the loose call.
  const rpc = client.rpc.bind(client) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: { ok: boolean; error?: string } | null; error: { code?: string; message: string } | null }>;
  const { data, error } = await rpc('update_booking_status', {
    _booking_id: bookingId,
    _status: status,
    ...(note ? { _note: note } : {}),
  });

  if (error?.code === 'PGRST202') {
    const patch = status === 'cancelled' ? { status, cancelled_reason: note ?? null } : { status };
    const res = await client.from('bookings').update(patch).eq('id', bookingId);
    if (res.error) throw res.error;
    return;
  }
  if (error) throw error;
  if (data && !data.ok) throw new Error(data.error ?? 'Could not update booking');
}

export function setBookingStatus(client: Client, bookingId: string, status: BookingStatus): Promise<void> {
  return changeStatus(client, bookingId, status);
}

export function declineBooking(client: Client, bookingId: string, reason: string): Promise<void> {
  return changeStatus(client, bookingId, 'cancelled', reason || 'Declined by shop');
}

/**
 * Calls onChange whenever a booking for this shop is created or updated.
 * Returns an unsubscribe function.
 */
export function subscribeToShopBookings(client: Client, vendorId: string, onChange: () => void): () => void {
  const channel = client
    .channel(`shop-bookings-${vendorId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings', filter: `vendor_id=eq.${vendorId}` },
      onChange,
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
