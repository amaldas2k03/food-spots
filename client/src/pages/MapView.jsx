import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Flame, Pin } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import StarRating from '../components/StarRating.jsx';
import { Spinner, EmptyState } from '../components/Feedback.jsx';
import { useGoogleMaps, MAP_STYLE, DEFAULT_CENTER } from '../hooks/useGoogleMaps.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { priceLabel, formatDistance } from '../utils/format.js';

export default function MapView() {
  const { ready, error: mapsError, configured } = useGoogleMaps();
  const { coords, request, loading: geoLoading } = useGeolocation();

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const heatmapRef = useRef(null);

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

  // Create the map once the API is ready.
  useEffect(() => {
    if (!ready || !mapEl.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapEl.current, {
      center: coords ?? DEFAULT_CENTER,
      zoom: 13,
      styles: MAP_STYLE,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [ready, coords]);

  const clearOverlays = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    heatmapRef.current?.setMap(null);
    heatmapRef.current = null;
  }, []);

  // Redraw overlays whenever the spots or the view mode change.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    clearOverlays();
    const maps = window.google.maps;

    if (mode === 'heatmap') {
      // Weight by review count, per the spec's heatmap rule.
      heatmapRef.current = new maps.visualization.HeatmapLayer({
        data: spots.map((s) => ({
          location: new maps.LatLng(s.lat, s.lng),
          weight: Math.max(1, s.reviewCount ?? 1),
        })),
        radius: 40,
        opacity: 0.75,
        map,
      });
    } else {
      markersRef.current = spots.map((spot) => {
        const marker = new maps.Marker({
          position: { lat: spot.lat, lng: spot.lng },
          map,
          title: spot.name,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#E07B39',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
        marker.addListener('click', () => {
          setSelected(spot);
          map.panTo({ lat: spot.lat, lng: spot.lng });
        });
        return marker;
      });
    }

    return clearOverlays;
  }, [ready, spots, mode, clearOverlays]);

  // Recentre when the user shares their location.
  useEffect(() => {
    if (coords && mapRef.current) mapRef.current.panTo(coords);
  }, [coords]);

  return (
    <div className="flex h-[calc(100vh-var(--spacing-navbar))]">
      <div className="relative w-[70%]">
        {!configured || mapsError ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="card max-w-md p-6 text-center">
              <MapPin size={24} className="mx-auto text-accent" />
              <p className="mt-2 font-medium">Map needs a Google Maps API key</p>
              <p className="mt-1 text-sm text-muted">
                Set <code className="rounded bg-bg px-1">VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
                <code className="rounded bg-bg px-1">client/.env</code> and reload. The spot list on
                the right works without it.
              </p>
              {mapsError && <p className="mt-2 text-xs text-red-600">{mapsError}</p>}
            </div>
          </div>
        ) : !ready ? (
          <Spinner label="Loading map…" />
        ) : null}

        <div ref={mapEl} className={`h-full w-full ${!configured || mapsError ? 'hidden' : ''}`} />

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
                    mapRef.current?.panTo({ lat: spot.lat, lng: spot.lng });
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
