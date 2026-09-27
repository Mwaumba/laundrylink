// Public Mapbox token. Prefer VITE_MAPBOX_TOKEN; the fallback is the token the
// map already shipped with, until it is moved into the environment.
export const MAPBOX_TOKEN: string =
  import.meta.env.VITE_MAPBOX_TOKEN ??
  'pk.eyJ1IjoibXdhdW1iYSIsImEiOiJjbWloczc4Z3owZ2s0M2Rxc2diaW0xMjByIn0.-caL6iXLzJ_utwiLOPYGQg';

/** Nairobi CBD, as [lng, lat] for Mapbox. */
export const NAIROBI_CENTER: [number, number] = [36.8219, -1.2864];
