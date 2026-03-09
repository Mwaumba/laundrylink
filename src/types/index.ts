export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  vendorCount: number;
  description: string;
}

export type VendorType = 'laundry-shop' | 'dry-cleaner' | 'ironing-service' | 'pickup-delivery' | 'independent';

export type AvailabilityStatus = 'accepting' | 'limited' | 'fully-booked';

export type BadgeType = 'verified' | 'trusted' | 'top-rated' | 'fast-response';

export interface VendorBadge {
  type: BadgeType;
  label: string;
  icon: string;
}

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface ServiceTag {
  id: string;
  label: string;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  type: VendorType;
  typeLabel: string;
  description: string;
  shortDescription: string;
  neighborhood: string;
  neighborhoodSlug: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  whatsapp: string;
  email: string;
  website?: string;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  availability: AvailabilityStatus;
  badges: VendorBadge[];
  serviceTags: string[];
  businessHours: BusinessHours[];
  hasPickup: boolean;
  hasDelivery: boolean;
  pickupRadius: number;
  neighborhoodsServed: string[];
  priceRange: string;
  responseTime: string;
  responseMinutes: number;
  profileViews: number;
  favorites: number;
  inquiries: number;
  images: string[];
  isFeatured: boolean;
  isVerified: boolean;
  joinedDate: string;
}
