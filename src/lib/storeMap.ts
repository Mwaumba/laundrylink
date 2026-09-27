// Store map helpers. Plain functions with no DOM, React or Mapbox imports so the
// React Native app can reuse them (GeoJSON works with @rnmapbox/maps as is).
import type { AvailabilityStatus, Vendor } from '@/types';
import type { LatLng } from '@/lib/geo';
import { hasCoordinates } from '@/lib/api/vendors';

export const AVAILABILITY_COLORS: Record<AvailabilityStatus, string> = {
  accepting: 'hsl(152, 60%, 42%)',
  limited: 'hsl(36, 92%, 50%)',
  'fully-booked': 'hsl(0, 78%, 56%)',
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  accepting: 'Accepting orders',
  limited: 'Limited slots',
  'fully-booked': 'Fully booked',
};

export interface StoreFeatureProperties {
  id: string;
  name: string;
  availability: AvailabilityStatus;
  color: string;
}

export interface StoreFeature {
  type: 'Feature';
  id: number;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: StoreFeatureProperties;
}

export interface StoreFeatureCollection {
  type: 'FeatureCollection';
  features: StoreFeature[];
}

/** [[west, south], [east, north]] */
export type Bounds = [[number, number], [number, number]];

/** Split vendors into those we can pin on a map and those with no location yet. */
export function partitionByLocation(vendors: Vendor[]): { mapped: Vendor[]; unmapped: Vendor[] } {
  const mapped: Vendor[] = [];
  const unmapped: Vendor[] = [];
  for (const v of vendors) (hasCoordinates(v) ? mapped : unmapped).push(v);
  return { mapped, unmapped };
}

/**
 * Vendors as a GeoJSON point collection. Feature ids are the vendor's index in
 * `vendors`, because map feature state needs numeric ids.
 */
export function vendorsToGeoJSON(vendors: Vendor[]): StoreFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: vendors.map((v, i) => ({
      type: 'Feature',
      id: i,
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: {
        id: v.id,
        name: v.name,
        availability: v.availability,
        color: AVAILABILITY_COLORS[v.availability] ?? AVAILABILITY_COLORS.accepting,
      },
    })),
  };
}

/** Bounding box around the given points, or null when there are none. */
export function boundsFor(points: LatLng[]): Bounds | null {
  if (points.length === 0) return null;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const { lat, lng } of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [[west, south], [east, north]];
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}
