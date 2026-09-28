// Vendor data access. Plain async functions with no DOM or React imports so
// they can be shared with the React Native app: pass in any Supabase client.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/integrations/supabase/types';
import type { AvailabilityStatus, BadgeType, BusinessHours, Review, Vendor, VendorType } from '@/types';

type Client = SupabaseClient<Database>;

// Only the columns customers may see. KYC/legal columns stay out of public queries.
export const PUBLIC_VENDOR_COLUMNS = [
  'id', 'name', 'slug', 'type', 'type_label', 'description', 'short_description',
  'neighborhood', 'neighborhood_slug', 'address', 'lat', 'lng', 'phone', 'whatsapp',
  'email', 'website', 'rating', 'review_count', 'availability', 'service_tags',
  'has_pickup', 'has_delivery', 'pickup_radius', 'neighborhoods_served', 'price_range',
  'response_time', 'response_minutes', 'profile_views', 'favorites_count',
  'inquiries_count', 'images', 'is_featured', 'is_verified', 'joined_date', 'is_claimed',
].join(', ');

const BADGE_ICONS: Record<BadgeType, string> = {
  verified: '✔',
  trusted: '✔',
  'top-rated': '⭐',
  'fast-response': '⚡',
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type VendorRow = Pick<
  Tables<'vendor_profiles'>,
  | 'id' | 'name' | 'slug' | 'type' | 'type_label' | 'description' | 'short_description'
  | 'neighborhood' | 'neighborhood_slug' | 'address' | 'lat' | 'lng' | 'phone' | 'whatsapp'
  | 'email' | 'website' | 'rating' | 'review_count' | 'availability' | 'service_tags'
  | 'has_pickup' | 'has_delivery' | 'pickup_radius' | 'neighborhoods_served' | 'price_range'
  | 'response_time' | 'response_minutes' | 'profile_views' | 'favorites_count'
  | 'inquiries_count' | 'images' | 'is_featured' | 'is_verified' | 'joined_date' | 'is_claimed'
>;
type HoursRow = Pick<Tables<'business_hours'>, 'vendor_id' | 'day' | 'open_time' | 'close_time' | 'is_closed'>;
type BadgeRow = Pick<Tables<'vendor_badges'>, 'vendor_id' | 'type' | 'label'>;
type ReviewRow = Pick<Tables<'reviews'>, 'id' | 'customer_name' | 'rating' | 'comment' | 'created_at'>;

export function toVendor(
  row: VendorRow,
  hours: HoursRow[] = [],
  badges: BadgeRow[] = [],
  reviews: ReviewRow[] = [],
): Vendor {
  const businessHours: BusinessHours[] = hours
    .map((h) => ({ day: h.day, open: h.open_time, close: h.close_time, isClosed: !!h.is_closed }))
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

  const mappedReviews: Review[] = reviews.map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    rating: r.rating,
    comment: r.comment ?? '',
    date: r.created_at.slice(0, 10),
  }));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type as VendorType,
    typeLabel: row.type_label,
    description: row.description ?? '',
    shortDescription: row.short_description ?? '',
    neighborhood: row.neighborhood ?? '',
    neighborhoodSlug: row.neighborhood_slug ?? '',
    address: row.address ?? '',
    // Onboarding does not capture coordinates yet; map views skip vendors without them.
    lat: row.lat ?? NaN,
    lng: row.lng ?? NaN,
    phone: row.phone ?? '',
    whatsapp: (row.whatsapp ?? '').replace(/\D/g, ''),
    email: row.email ?? '',
    website: row.website ?? undefined,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    reviews: mappedReviews,
    availability: (row.availability ?? 'accepting') as AvailabilityStatus,
    badges: badges.map((b) => ({ type: b.type as BadgeType, label: b.label, icon: BADGE_ICONS[b.type as BadgeType] ?? '✔' })),
    serviceTags: row.service_tags ?? [],
    businessHours,
    hasPickup: !!row.has_pickup,
    hasDelivery: !!row.has_delivery,
    pickupRadius: row.pickup_radius ?? 0,
    neighborhoodsServed: row.neighborhoods_served ?? [],
    priceRange: row.price_range ?? '',
    responseTime: row.response_time ?? '',
    // 0 means "unknown", which must not count as a fast responder.
    responseMinutes: row.response_minutes || Number.POSITIVE_INFINITY,
    profileViews: row.profile_views ?? 0,
    favorites: row.favorites_count ?? 0,
    inquiries: row.inquiries_count ?? 0,
    images: row.images ?? [],
    isFeatured: !!row.is_featured,
    isVerified: !!row.is_verified,
    joinedDate: row.joined_date ?? '',
    // Listed by an admin before the owner joined: shown, but not bookable.
    isClaimed: row.is_claimed !== false,
  };
}

export function hasCoordinates(v: Pick<Vendor, 'lat' | 'lng'>): boolean {
  return Number.isFinite(v.lat) && Number.isFinite(v.lng);
}

/** All approved vendors, with hours and badges, featured and best rated first. */
export async function fetchApprovedVendors(client: Client): Promise<Vendor[]> {
  const { data, error } = await client
    .from('vendor_profiles')
    .select(PUBLIC_VENDOR_COLUMNS)
    .eq('status', 'approved')
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as VendorRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [hoursRes, badgesRes] = await Promise.all([
    client.from('business_hours').select('vendor_id, day, open_time, close_time, is_closed').in('vendor_id', ids),
    client.from('vendor_badges').select('vendor_id, type, label').in('vendor_id', ids),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  if (badgesRes.error) throw badgesRes.error;

  return rows.map((r) =>
    toVendor(
      r,
      (hoursRes.data ?? []).filter((h) => h.vendor_id === r.id),
      (badgesRes.data ?? []).filter((b) => b.vendor_id === r.id),
    ),
  );
}

/** One approved vendor by slug, with hours, badges and latest reviews. Null if not found. */
export async function fetchVendorBySlug(client: Client, slug: string): Promise<Vendor | null> {
  const { data, error } = await client
    .from('vendor_profiles')
    .select(PUBLIC_VENDOR_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as VendorRow;

  const [hoursRes, badgesRes, reviewsRes] = await Promise.all([
    client.from('business_hours').select('vendor_id, day, open_time, close_time, is_closed').eq('vendor_id', row.id),
    client.from('vendor_badges').select('vendor_id, type, label').eq('vendor_id', row.id),
    client
      .from('reviews')
      .select('id, customer_name, rating, comment, created_at')
      .eq('vendor_id', row.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  if (badgesRes.error) throw badgesRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  return toVendor(row, hoursRes.data ?? [], badgesRes.data ?? [], reviewsRes.data ?? []);
}
