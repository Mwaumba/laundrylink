import { describe, expect, it } from 'vitest';
import type { Vendor } from '@/types';
import { boundsFor, distanceKm, formatDistance, partitionByLocation, vendorsToGeoJSON } from './storeMap';

const v = (id: string, lat: number, lng: number, availability: Vendor['availability'] = 'accepting') =>
  ({ id, name: `Shop ${id}`, lat, lng, availability }) as Vendor;

describe('store map helpers', () => {
  it('separates shops without coordinates', () => {
    const { mapped, unmapped } = partitionByLocation([v('a', -1.28, 36.82), v('b', NaN, NaN)]);
    expect(mapped.map((x) => x.id)).toEqual(['a']);
    expect(unmapped.map((x) => x.id)).toEqual(['b']);
  });

  it('builds GeoJSON with numeric ids and lng/lat order', () => {
    const fc = vendorsToGeoJSON([v('a', -1.28, 36.82, 'limited')]);
    expect(fc.features[0].id).toBe(0);
    expect(fc.features[0].geometry.coordinates).toEqual([36.82, -1.28]);
    expect(fc.features[0].properties).toMatchObject({ id: 'a', availability: 'limited' });
  });

  it('computes bounds', () => {
    expect(boundsFor([])).toBeNull();
    expect(boundsFor([{ lat: -1.3, lng: 36.7 }, { lat: -1.2, lng: 36.9 }])).toEqual([[36.7, -1.3], [36.9, -1.2]]);
  });

  it('measures and formats distance', () => {
    const km = distanceKm({ lat: -1.2864, lng: 36.8219 }, { lat: -1.2921, lng: 36.7856 });
    expect(km).toBeGreaterThan(3.5);
    expect(km).toBeLessThan(4.5);
    expect(formatDistance(0.42)).toBe('420 m away');
    expect(formatDistance(3.94)).toBe('3.9 km away');
  });
});
