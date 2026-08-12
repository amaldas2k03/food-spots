import { useState, useCallback } from 'react';

/**
 * Wraps the browser geolocation API. Location is requested on demand rather
 * than on mount so the permission prompt is tied to a user action.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setError('Location is not supported by this browser');
          return resolve(null);
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCoords(next);
            setError(null);
            setLoading(false);
            resolve(next);
          },
          (err) => {
            setError(
              err.code === err.PERMISSION_DENIED
                ? 'Location permission denied'
                : 'Could not determine your location',
            );
            setLoading(false);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
      }),
    [],
  );

  return { coords, error, loading, request };
}
