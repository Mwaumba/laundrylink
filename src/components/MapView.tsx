import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Vendor } from '@/types';
import { Link } from 'react-router-dom';
import { MAPBOX_TOKEN, NAIROBI_CENTER } from '@/lib/mapbox';
import type { LatLng } from '@/lib/geo';
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  boundsFor,
  distanceKm,
  formatDistance,
  partitionByLocation,
  vendorsToGeoJSON,
} from '@/lib/storeMap';

interface MapViewProps {
  vendors: Vendor[];
  onVendorSelect?: (vendor: Vendor) => void;
}

const SOURCE = 'stores';
const LABEL_FONT = ['DIN Pro Medium', 'Arial Unicode MS Regular'];

// Stores are drawn as map layers rather than DOM markers, so they stay pinned
// to their coordinates while hovering, panning and zooming, and nearby stores
// group into clusters instead of piling on top of each other.
const MapView = ({ vendors, onVendorSelect }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);

  const { mapped, unmapped } = useMemo(() => partitionByLocation(vendors), [vendors]);

  // Map event handlers are registered once, so they read the latest values through refs.
  const mappedRef = useRef(mapped);
  mappedRef.current = mapped;
  const onSelectRef = useRef(onVendorSelect);
  onSelectRef.current = onVendorSelect;
  const selectedIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    let m: mapboxgl.Map;
    try {
      m = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: NAIROBI_CENTER,
        zoom: 12,
      });
    } catch {
      setMapError('The map could not be loaded on this device.');
      return;
    }
    map.current = m;

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    m.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    m.addControl(geolocate, 'top-right');
    m.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    geolocate.on('geolocate', (e: GeolocationPosition) => {
      setUserLocation({ lat: e.coords.latitude, lng: e.coords.longitude });
    });

    const hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });
    let hoveredId: number | null = null;
    const setHover = (id: number | null) => {
      if (hoveredId !== null) m.setFeatureState({ source: SOURCE, id: hoveredId }, { hover: false });
      hoveredId = id;
      if (id !== null) m.setFeatureState({ source: SOURCE, id }, { hover: true });
    };

    let loaded = false;
    m.on('error', (e) => {
      // Tile hiccups after load are retried by Mapbox; a failed style or token is fatal.
      if (!loaded) setMapError('The map could not be loaded.');
      console.error('Map error', e.error);
    });

    m.on('load', () => {
      loaded = true;
      m.addSource(SOURCE, {
        type: 'geojson',
        data: vendorsToGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 45,
      });

      m.addLayer({
        id: 'store-clusters',
        type: 'circle',
        source: SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'hsl(214, 78%, 42%)',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 30],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
      m.addLayer({
        id: 'store-cluster-count',
        type: 'symbol',
        source: SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': LABEL_FONT,
          'text-size': 13,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
      m.addLayer({
        id: 'store-points',
        type: 'circle',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 14,
            ['boolean', ['feature-state', 'hover'], false], 13,
            10,
          ],
          'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4, 3],
          'circle-stroke-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 'hsl(214, 78%, 42%)',
            '#ffffff',
          ],
        },
      });
      m.addLayer({
        id: 'store-labels',
        type: 'symbol',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        minzoom: 13,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': LABEL_FONT,
          'text-size': 12,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-max-width': 10,
        },
        paint: { 'text-color': 'hsl(220, 30%, 14%)', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
      });

      m.on('mousemove', 'store-points', (e) => {
        const f = e.features?.[0];
        if (!f || typeof f.id !== 'number') return;
        m.getCanvas().style.cursor = 'pointer';
        if (f.id === hoveredId) return;
        setHover(f.id);
        const vendor = mappedRef.current[f.id];
        if (!vendor) return;
        hoverPopup
          .setLngLat([vendor.lng, vendor.lat])
          .setHTML(
            `<strong>${escapeHtml(vendor.name)}</strong><br/><span style="color:${AVAILABILITY_COLORS[vendor.availability]}">${AVAILABILITY_LABELS[vendor.availability]}</span> · ⭐ ${vendor.rating}`,
          )
          .addTo(m);
      });
      m.on('mouseleave', 'store-points', () => {
        m.getCanvas().style.cursor = '';
        setHover(null);
        hoverPopup.remove();
      });
      m.on('mouseenter', 'store-clusters', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'store-clusters', () => { m.getCanvas().style.cursor = ''; });

      m.on('click', 'store-clusters', (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== 'Point') return;
        const center = f.geometry.coordinates as [number, number];
        (m.getSource(SOURCE) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          f.properties?.cluster_id,
          (err, zoom) => {
            if (err || zoom == null) return;
            m.easeTo({ center, zoom: zoom + 0.5 });
          },
        );
      });

      m.on('click', 'store-points', (e) => {
        const f = e.features?.[0];
        if (!f || typeof f.id !== 'number') return;
        const vendor = mappedRef.current[f.id];
        if (!vendor) return;
        hoverPopup.remove();
        setSelectedVendor(vendor);
        onSelectRef.current?.(vendor);
        m.easeTo({ center: [vendor.lng, vendor.lat], zoom: Math.max(m.getZoom(), 14) });
      });

      setMapReady(true);
    });

    // Split/list/map toggles resize the container without a window resize.
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(mapContainer.current);

    return () => {
      observer.disconnect();
      hoverPopup.remove();
      m.remove();
      map.current = null;
      setMapReady(false);
    };
  }, []);

  // Push the current results to the map and frame them.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    // Feature ids are list positions, so old hover/selection state would land on the wrong store.
    m.removeFeatureState({ source: SOURCE });
    selectedIdRef.current = null;
    (m.getSource(SOURCE) as mapboxgl.GeoJSONSource).setData(vendorsToGeoJSON(mapped));

    const bounds = boundsFor(mapped);
    if (bounds) m.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
  }, [mapped, mapReady]);

  // Keep the selected store highlighted and drop it when it is filtered out.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    if (selectedIdRef.current !== null) {
      m.setFeatureState({ source: SOURCE, id: selectedIdRef.current }, { selected: false });
      selectedIdRef.current = null;
    }
    if (!selectedVendor) return;
    const idx = mapped.findIndex((v) => v.id === selectedVendor.id);
    if (idx === -1) {
      setSelectedVendor(null);
      return;
    }
    m.setFeatureState({ source: SOURCE, id: idx }, { selected: true });
    selectedIdRef.current = idx;
  }, [selectedVendor, mapped, mapReady]);

  const selectedDistance =
    selectedVendor && userLocation ? formatDistance(distanceKm(userLocation, selectedVendor)) : null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <div ref={mapContainer} className="h-full w-full" />

      {mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-secondary p-6 text-center">
          <div>
            <p className="font-medium text-foreground">Map unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">{mapError} The list still shows every shop.</p>
          </div>
        </div>
      )}

      {!mapError && (
        <div className="absolute left-3 top-3 z-10 max-w-[70%] rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {(Object.keys(AVAILABILITY_LABELS) as (keyof typeof AVAILABILITY_LABELS)[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: AVAILABILITY_COLORS[k] }} />
                {AVAILABILITY_LABELS[k]}
              </span>
            ))}
          </div>
          {mapReady && mapped.length === 0 && vendors.length > 0 && (
            <p className="mt-1 text-muted-foreground">None of these shops have a map location yet.</p>
          )}
          {mapped.length > 0 && unmapped.length > 0 && (
            <p className="mt-1 text-muted-foreground">
              {unmapped.length} {unmapped.length === 1 ? 'shop has' : 'shops have'} no map location yet and only show in the list.
            </p>
          )}
        </div>
      )}

      {selectedVendor && (
        <div className="absolute bottom-8 left-4 right-4 z-10 rounded-xl border border-border bg-card p-4 shadow-lg sm:left-auto sm:right-4 sm:w-80">
          <button
            onClick={() => setSelectedVendor(null)}
            aria-label="Close"
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
          >
            ✕
          </button>
          <div className="flex items-start gap-3">
            <div
              className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
              style={{ background: AVAILABILITY_COLORS[selectedVendor.availability] }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="pr-5 font-display font-bold text-foreground">{selectedVendor.name}</h3>
              <p className="text-sm text-muted-foreground">
                {[selectedVendor.address || selectedVendor.neighborhood, selectedDistance].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-0.5 text-xs font-medium" style={{ color: AVAILABILITY_COLORS[selectedVendor.availability] }}>
                {AVAILABILITY_LABELS[selectedVendor.availability]}
              </p>
              {selectedVendor.shortDescription && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{selectedVendor.shortDescription}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-foreground">⭐ {selectedVendor.rating}</span>
                <span className="text-muted-foreground">({selectedVendor.reviewCount} reviews)</span>
                {selectedVendor.priceRange && <span className="text-muted-foreground">{selectedVendor.priceRange}</span>}
                {selectedVendor.responseTime && <span className="text-muted-foreground">Responds {selectedVendor.responseTime.toLowerCase()}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedVendor.hasPickup && (
                  <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-medium text-sky-foreground">🚗 Pickup</span>
                )}
                {selectedVendor.hasDelivery && (
                  <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-medium text-sky-foreground">📦 Delivery</span>
                )}
                {selectedVendor.badges.slice(0, 2).map((b) => (
                  <span key={b.type} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {b.icon} {b.label}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  to={`/vendor/${selectedVendor.slug}`}
                  className="flex-1 rounded-lg bg-primary py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View Profile
                </Link>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVendor.lat},${selectedVendor.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Directions
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export default MapView;
