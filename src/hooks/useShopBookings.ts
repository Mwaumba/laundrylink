import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  type BookingStatus,
  declineBooking,
  fetchShopBookings,
  setBookingStatus,
  subscribeToShopBookings,
} from '@/lib/api/bookings';

const shopBookingsKey = (vendorId: string) => ['shop-bookings', vendorId] as const;

/** A shop's bookings, kept live with Supabase Realtime. */
export function useShopBookings(vendorId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!vendorId) return;
    return subscribeToShopBookings(supabase, vendorId, () => {
      queryClient.invalidateQueries({ queryKey: shopBookingsKey(vendorId) });
    });
  }, [vendorId, queryClient]);

  return useQuery({
    queryKey: shopBookingsKey(vendorId ?? ''),
    queryFn: () => fetchShopBookings(supabase, vendorId!),
    enabled: !!vendorId,
  });
}

export function useUpdateShopBooking(vendorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { bookingId: string; status: BookingStatus; reason?: string }) =>
      args.status === 'cancelled'
        ? declineBooking(supabase, args.bookingId, args.reason ?? '')
        : setBookingStatus(supabase, args.bookingId, args.status),
    onSettled: () => {
      if (vendorId) queryClient.invalidateQueries({ queryKey: shopBookingsKey(vendorId) });
    },
  });
}
