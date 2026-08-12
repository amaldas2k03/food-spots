import { useEffect, useRef, useState } from 'react';
// maplibre-gl v6 ships named exports only; `Map` is aliased to avoid the global.
import { MapLibreMap, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const API_KEY = import.meta.env.VITE_MAPTILER_KEY;

// MapTiler's standard street map. Their style JSON carries the tile, glyph and
// sprite URLs, so this one endpoint is the whole basemap configuration.
const STYLE = 'streets-v2';

export const MAP_STYLE_URL = API_KEY
  ? `https://api.maptiler.com/maps/${STYLE}/style.json?key=${API_KEY}`
  : null;

export const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

/** MapLibre takes [lng, lat]; the rest of the app stores {lat, lng}. */
export const toLngLat = ({ lat, lng }) => [lng, lat];

/** --color-accent, for paint properties that can't read CSS variables. */
export const ACCENT = '#e07b39';

/**
 * Creates a MapLibre map inside `containerRef` and reports status.
 * `center`/`zoom` are initial values only — move the camera afterwards with
 * `map.current.panTo()` / `fitBounds()`.
 *
 * Note on zoom: MapLibre's 512px tile scheme makes zoom z twice the scale of
 * the same number in Google's 256px scheme, so callers porting a Google zoom
 * should subtract one.
 *
 * Callers render a fallback when `configured` is false or `error` is set
 * rather than a blank map.
 */
export function useMap(containerRef, { center = DEFAULT_CENTER, zoom = 13 } = {}) {
  const mapRef = useRef(null);
  const viewRef = useRef({ center, zoom });
  const [state, setState] = useState({ ready: false, error: null });

  useEffect(() => {
    if (!MAP_STYLE_URL || !containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: toLngLat(viewRef.current.center),
      zoom: viewRef.current.zoom,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    // Ready as soon as the style is parsed — that is all addSource/addLayer and
    // the markers need. Deliberately not `isStyleLoaded()`, which means *fully*
    // loaded including every tile and so can still be false at 'load'.
    const markReady = () => setState((prev) => (prev.ready ? prev : { ready: true, error: null }));
    // A rejected key fails the style request, so the style never parses.
    // Errors after that point are transient tile failures — leave the map up.
    const onError = (event) =>
      setState((prev) =>
        prev.ready
          ? prev
          : { ready: false, error: event.error?.message ?? 'MapTiler style failed to load' },
      );

    map.on('style.load', markReady);
    map.on('load', markReady);
    map.on('error', onError);

    return () => {
      map.remove();
      mapRef.current = null;
      setState({ ready: false, error: null });
    };
  }, [containerRef]);

  return { map: mapRef, ready: state.ready, error: state.error, configured: Boolean(API_KEY) };
}
