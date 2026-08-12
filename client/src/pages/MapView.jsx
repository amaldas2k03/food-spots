import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Marker } from 'maplibre-gl';
import { MapPin, Flame, Pin } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import StarRating from '../components/StarRating.jsx';
import MapNotice from '../components/MapNotice.jsx';
import { Spinner, EmptyState } from '../components/Feedback.jsx';
import { useMap, DEFAULT_CENTER } from '../hooks/useMap.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { priceLabel, formatDistance } from '../utils/format.js';

const SPOTS_SOURCE = 'spots';
const HEATMAP_LAYER = 'spots-heatmap';

export default function MapView() {
  const { coords, request, loading: geoLoading } = useGeolocation();

  const mapEl = useRef(null);
  const { map: mapRef, ready, error: mapsError, configured } = useMap(mapEl, {
    center: DEFAULT_CENTER,
    zoom: 12, // same city-wide framing as the previous Google zoom 13
  });
  const markersRef = useRef([]);

  const [spots, setSpots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [radius, setRadius] = useState(5000);
  const [mode, setMode] = useState('pins'); // 'pins' | 'heatmap'
  const [loading, setLoading] = useState(true);

  // Load spots, re-fetching when the radius or the user's location changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    spotsApi
      .getSpots(coords ? { lat: coords.lat, lng: coords.lng, radius, take: 100 } : { take: 100 })
      .then((result) => !cancelled && setSpots(result))
      .catch(() => !cancelled && setSpots([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [coords, radius]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  // Redraw overlays whenever the spots or the view mode change.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    clearMarkers();

    // One source feeds both modes; the heatmap reads `weight` from it.
    const data = {
      type: 'FeatureCollection',
      features: spots.map((spot) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [spot.lng, spot.lat] },
        properties: { weight: Math.max(1, spot.reviewCount ?? 1) },
      })),
    };
    if (map.getSource(SPOTS_SOURCE)) map.getSource(SPOTS_SOURCE).setData(data);
    else map.addSource(SPOTS_SOURCE, { type: 'geojson', data });

    if (mode === 'heatmap') {
      // Weight by review count, per the spec's heatmap rule. Weights are
      // normalised against the busiest spot so the ramp uses its full range.
      const maxWeight = Math.max(1, ...data.features.map((f) => f.properties.weight));
      const weight = ['interpolate', ['linear'], ['get', 'weight'], 0, 0, maxWeight, 1];

      if (map.getLayer(HEATMAP_LAYER)) {
        map.setPaintProperty(HEATMAP_LAYER, 'heatmap-weight', weight);
      } else {
        map.addLayer({
          id: HEATMAP_LAYER,
          type: 'heatmap',
          source: SPOTS_SOURCE,
          paint: {
            'heatmap-weight': weight,
            // Radius in screen pixels and a flat intensity, matching the
            // density falloff the previous heatmap rendered.
            'heatmap-radius': 40,
            'heatmap-intensity': 1,
            'heatmap-opacity': 0.75,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0,255,255,0)',
              0.1, 'rgba(0,255,255,1)',
              0.25, 'rgba(0,127,255,1)',
              0.45, 'rgba(0,0,255,1)',
              0.65, 'rgba(0,0,159,1)',
              0.8, 'rgba(127,0,63,1)',
              1, 'rgba(255,0,0,1)',
            ],
          },
        });
      }
    } else {
      if (map.getLayer(HEATMAP_LAYER)) map.removeLayer(HEATMAP_LAYER);

      markersRef.current = spots.map((spot) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.title = spot.name;
        el.setAttribute('aria-label', spot.name);
        el.className =
          'h-4 w-4 cursor-pointer rounded-full border-2 border-white bg-accent shadow-card';
        el.addEventListener('click', () => {
          setSelected(spot);
          map.panTo([spot.lng, spot.lat]);
        });
        return new Marker({ element: el }).setLngLat([spot.lng, spot.lat]).addTo(map);
      });
    }

    return clearMarkers;
  }, [ready, spots, mode, clearMarkers, mapRef]);

  // Recentre when the user shares their location.
  useEffect(() => {
    if (coords && mapRef.current) mapRef.current.panTo([coords.lng, coords.lat]);
  }, [coords, mapRef]);

  return (
    <div className="flex h-[calc(100vh-var(--spacing-navbar))]">
      <div className="relative w-[70%]">
        {/* Both states overlay the canvas so it keeps its container and size. */}
        {!configured || mapsError ? (
          <div className="absolute inset-0 bg-bg">
            <MapNotice
              title="Map needs a MapTiler API key"
              hint="The spot list on the right works without it."
              error={mapsError}
            />
          </div>
        ) : !ready ? (
          <div className="absolute inset-0 bg-bg">
            <Spinner label="Loading map…" />
          </div>
        ) : null}

        <div ref={mapEl} className="h-full w-full" />

        {/* Floating controls sit above the map canvas. */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="card flex overflow-hidden p-1">
            <button
              type="button"
              onClick={() => setMode('pins')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'pins' ? 'bg-accent text-white' : 'hover:bg-bg'
              }`}
            >
              <Pin size={13} /> Pins
            </button>
            <button
              type="button"
              onClick={() => setMode('heatmap')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'heatmap' ? 'bg-accent text-white' : 'hover:bg-bg'
              }`}
            >
              <Flame size={13} /> Heatmap
            </button>
          </div>
        </div>

        <div className="card absolute bottom-4 left-4 w-64 p-3">
          {coords ? (
            <>
              <label htmlFor="radius" className="text-xs font-medium">
                Search radius: {formatDistance(radius)}
              </label>
              <input
                id="radius"
                type="range"
                min={500}
                max={25000}
                step={500}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="mt-1.5 w-full accent-[var(--color-accent)]"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={request}
              disabled={geoLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              <MapPin size={13} />
              {geoLoading ? 'Locating…' : 'Search near me'}
            </button>
          )}
        </div>
      </div>

      <aside className="w-[30%] overflow-y-auto border-l border-line bg-surface">
        <div className="sticky top-0 border-b border-line bg-surface px-4 py-3">
          <h2 className="font-semibold">
            {selected ? 'Selected spot' : `${spots.length} spot${spots.length === 1 ? '' : 's'}`}
          </h2>
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-accent hover:underline"
            >
              ← Back to all spots
            </button>
          )}
        </div>

        {loading ? (
          <Spinner />
        ) : selected ? (
          <div className="p-4">
            {selected.photos?.[0] && (
              <img
                src={selected.photos[0]}
                alt={selected.name}
                className="aspect-video w-full rounded-lg object-cover"
              />
            )}
            <h3 className="mt-3 font-display text-lg font-semibold">{selected.name}</h3>
            <p className="text-xs text-muted">
              {selected.cuisineType?.join(' · ')} · {priceLabel(selected.priceRange)}
            </p>
            <div className="mt-2">
              <StarRating value={selected.overallRating} showValue />
            </div>
            <p className="mt-2 text-sm text-muted">{selected.address}</p>
            <Link
              to={`/spots/${selected.id}`}
              className="mt-3 block rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-white hover:bg-accent-dark"
            >
              View details
            </Link>
          </div>
        ) : spots.length === 0 ? (
          <EmptyState title="No spots in view" hint="Widen the radius or clear your location filter." />
        ) : (
          <ul className="divide-y divide-line">
            {spots.map((spot) => (
              <li key={spot.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(spot);
                    mapRef.current?.panTo([spot.lng, spot.lat]);
                  }}
                  className="flex w-full gap-3 p-3 text-left hover:bg-bg"
                >
                  {spot.photos?.[0] && (
                    <img
                      src={spot.photos[0]}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{spot.name}</p>
                    <p className="truncate text-xs text-muted">
                      {spot.cuisineType?.join(' · ')} · {priceLabel(spot.priceRange)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <StarRating value={spot.overallRating} size={12} showValue />
                      {spot.distance != null && (
                        <span className="text-xs text-muted">{formatDistance(spot.distance)}</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
