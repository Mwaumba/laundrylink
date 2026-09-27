export interface LatLng {
  lat: number;
  lng: number;
}

/** Ask the browser for the device's position. Rejects with a readable message. */
export const getCurrentPosition = (): Promise<LatLng> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not available on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied'
              : 'Could not get your location',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
