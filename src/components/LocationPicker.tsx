import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import UseLocationButton from '@/components/UseLocationButton';
import type { LatLng } from '@/lib/geo';
import { MAPBOX_TOKEN, NAIROBI_CENTER } from '@/lib/mapbox';

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  /** Where to centre the map before a pin is placed (e.g. the chosen neighborhood). */
  fallbackCenter?: LatLng | null;
}

/** A map with a draggable pin. Click or drag to place it, or use the device location. */
const LocationPicker = ({ value, onChange, fallbackCenter }: LocationPickerProps) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!container.current || map.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const start = value ?? fallbackCenter;
    map.current = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: start ? [start.lng, start.lat] : NAIROBI_CENTER,
      zoom: start ? 15 : 12,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.current.on('click', (e) => onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // Only on mount; later changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin in sync with the value.
  useEffect(() => {
    if (!map.current || !value) return;
    if (!marker.current) {
      marker.current = new mapboxgl.Marker({ draggable: true, color: 'hsl(14, 80%, 55%)' })
        .setLngLat([value.lng, value.lat])
        .addTo(map.current);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLngLat();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      marker.current.setLngLat([value.lng, value.lat]);
    }
    map.current.easeTo({ center: [value.lng, value.lat], zoom: Math.max(map.current.getZoom(), 15) });
  }, [value]);

  // Follow the neighborhood choice until a pin is placed.
  useEffect(() => {
    if (!map.current || value || !fallbackCenter) return;
    map.current.easeTo({ center: [fallbackCenter.lng, fallbackCenter.lat], zoom: 14 });
  }, [fallbackCenter, value]);

  return (
    <div className="space-y-2">
      <div ref={container} className="h-64 w-full overflow-hidden rounded-xl border border-border" />
      <div className="flex flex-wrap items-center gap-2">
        <UseLocationButton value={null} onChange={onChange} label="I'm at the shop now" />
        <span className="text-xs text-muted-foreground">
          {value ? 'Drag the pin to adjust.' : 'Tap the map where your shop is.'}
        </span>
      </div>
    </div>
  );
};

export default LocationPicker;
