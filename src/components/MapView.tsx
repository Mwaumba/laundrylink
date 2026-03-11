import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Vendor } from '@/types';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface MapViewProps {
  vendors: Vendor[];
  onVendorSelect?: (vendor: Vendor) => void;
}

const MapView = ({ vendors, onVendorSelect }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error || !data?.token) {
          setTokenError(true);
          return;
        }
        mapboxgl.accessToken = data.token;
        setTokenLoaded(true);
      } catch {
        setTokenError(true);
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current || !tokenLoaded) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [36.8219, -1.2864],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [tokenLoaded]);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    vendors.forEach((vendor) => {
      const statusColor =
        vendor.availability === 'accepting'
          ? 'hsl(152, 60%, 42%)'
          : vendor.availability === 'limited'
          ? 'hsl(38, 92%, 50%)'
          : 'hsl(0, 84%, 60%)';

      const el = document.createElement('div');
      el.className = 'map-marker';
      el.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: ${statusColor}; border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;
        transition: transform 0.2s;
      `;
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([vendor.lng, vendor.lat])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedVendor(vendor);
        onVendorSelect?.(vendor);
        map.current?.flyTo({ center: [vendor.lng, vendor.lat], zoom: 14 });
      });

      markersRef.current.push(marker);
    });

    if (vendors.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      vendors.forEach((v) => bounds.extend([v.lng, v.lat]));
      map.current.fitBounds(bounds, { padding: 60 });
    }
  }, [vendors, onVendorSelect, tokenLoaded]);

  if (tokenError) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-muted/80">
        <div className="rounded-xl bg-card p-6 text-center shadow-lg">
          <p className="font-display font-bold text-foreground">Map Unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">Mapbox token could not be loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full rounded-xl" />

      {selectedVendor && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-xl border border-border bg-card p-4 shadow-lg sm:left-auto sm:right-4 sm:w-80">
          <button
            onClick={() => setSelectedVendor(null)}
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
          >
            ✕
          </button>
          <div className="flex items-start gap-3">
            <div
              className={`mt-1 h-3 w-3 rounded-full ${
                selectedVendor.availability === 'accepting'
                  ? 'bg-success'
                  : selectedVendor.availability === 'limited'
                  ? 'bg-warning'
                  : 'bg-destructive'
              }`}
            />
            <div className="flex-1">
              <h3 className="font-display font-bold text-foreground">{selectedVendor.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedVendor.neighborhood}</p>
              <p className="mt-1 text-sm text-muted-foreground">{selectedVendor.shortDescription}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">⭐ {selectedVendor.rating}</span>
                <span className="text-sm text-muted-foreground">({selectedVendor.reviewCount} reviews)</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedVendor.hasPickup && (
                  <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-medium text-sky-foreground">
                    🚗 Pickup
                  </span>
                )}
                {selectedVendor.badges.slice(0, 2).map((b) => (
                  <span key={b.type} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {b.icon} {b.label}
                  </span>
                ))}
              </div>
              <Link
                to={`/vendor/${selectedVendor.slug}`}
                className="mt-3 block rounded-lg bg-primary py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>
      )}

      {!tokenLoaded && !tokenError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/80 backdrop-blur-sm">
          <div className="rounded-xl bg-card p-6 text-center shadow-lg">
            <p className="font-display font-bold text-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
