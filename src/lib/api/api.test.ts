import { describe, expect, it } from 'vitest';
import { nextShopStatus } from './bookings';
import { hasCoordinates, toVendor } from './vendors';

describe('nextShopStatus', () => {
  const b = (status: Parameters<typeof nextShopStatus>[0]['status'], pickup = false, delivery = false) =>
    nextShopStatus({ status, pickup_required: pickup, delivery_required: delivery })?.status;

  it('walks a pickup and delivery booking through every step', () => {
    expect(b('requested', true, true)).toBe('accepted');
    expect(b('accepted', true, true)).toBe('pickup_scheduled');
    expect(b('pickup_scheduled', true, true)).toBe('picked_up');
    expect(b('picked_up', true, true)).toBe('in_progress');
    expect(b('in_progress', true, true)).toBe('ready');
    expect(b('ready', true, true)).toBe('out_for_delivery');
    expect(b('out_for_delivery', true, true)).toBe('completed');
  });

  it('skips pickup and delivery when not requested', () => {
    expect(b('accepted')).toBe('in_progress');
    expect(b('ready')).toBe('completed');
  });

  it('has no next step for finished bookings', () => {
    expect(b('completed')).toBeUndefined();
    expect(b('cancelled')).toBeUndefined();
  });
});

describe('toVendor', () => {
  it('fills defaults for a freshly approved vendor', () => {
    const v = toVendor(
      {
        id: 'v1', name: 'Shop', slug: 'shop', type: 'laundry-shop', type_label: 'Laundry Shop',
        description: null, short_description: null, neighborhood: null, neighborhood_slug: null,
        address: null, lat: null, lng: null, phone: null, whatsapp: '+254 712 345 678', email: null,
        website: null, rating: null, review_count: null, availability: null, service_tags: null,
        has_pickup: null, has_delivery: null, pickup_radius: null, neighborhoods_served: null,
        price_range: null, response_time: null, response_minutes: 0, profile_views: null,
        favorites_count: null, inquiries_count: null, images: null, is_featured: null,
        is_verified: null, joined_date: null,
      },
      [
        { vendor_id: 'v1', day: 'Tuesday', open_time: '08:00', close_time: '18:00', is_closed: false },
        { vendor_id: 'v1', day: 'Monday', open_time: '08:00', close_time: '18:00', is_closed: null },
      ],
    );
    expect(v.whatsapp).toBe('254712345678');
    expect(v.availability).toBe('accepting');
    expect(v.responseMinutes <= 5).toBe(false);
    expect(v.businessHours.map((h) => h.day)).toEqual(['Monday', 'Tuesday']);
    expect(hasCoordinates(v)).toBe(false);
  });
});
