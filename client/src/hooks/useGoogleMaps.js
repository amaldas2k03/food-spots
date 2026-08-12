import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// One Loader instance per page load; creating several with different options throws.
let loaderPromise = null;

function load() {
  if (!API_KEY) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
  loaderPromise ??= new Loader({
    apiKey: API_KEY,
    version: 'weekly',
    libraries: ['places', 'visualization'], // visualization = heatmap layer
  }).load();
  return loaderPromise;
}

/**
 * Loads the Maps JS API once and reports status.
 * Callers render a fallback when `error` is set rather than a blank map.
 */
export function useGoogleMaps() {
  const [state, setState] = useState({ ready: false, error: null });

  useEffect(() => {
    let cancelled = false;
    load()
      .then(() => !cancelled && setState({ ready: true, error: null }))
      .catch((err) => !cancelled && setState({ ready: false, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, configured: Boolean(API_KEY) };
}

/** Greyscale styling so pins and the heatmap carry the colour. */
export const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f2ed' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f9f6f1' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#eae5dc' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dfe6e8' }] },
];

export const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
