import { useEffect, useRef, useState, useCallback } from 'react';
import { LngLatBounds, Marker } from 'maplibre-gl';
import { Search, GripVertical, X, Route as RouteIcon, Save, Clock, MapPin } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import * as crawlsApi from '../api/crawls.js';
import { useCrawlStore } from '../store/crawlStore.js';
import { useAuthStore } from '../store/authStore.js';
import MapNotice from '../components/MapNotice.jsx';
import { useMap, DEFAULT_CENTER, ACCENT } from '../hooks/useMap.js';
import { decodePolyline } from '../utils/polyline.js';
import { formatDistance, formatDuration, priceLabel } from '../utils/format.js';

const ROUTE_SOURCE = 'crawl-route';
const ROUTE_LAYER = 'crawl-route-line';

export default function CrawlPlanner() {
  const user = useAuthStore((s) => s.user);
  const { stops, title, setTitle, addStop, removeStop, moveStop, reset } = useCrawlStore();

  const mapEl = useRef(null);
  const { map: mapRef, ready, configured, error: mapsError } = useMap(mapEl, {
    center: DEFAULT_CENTER,
    zoom: 11, // same framing as the previous Google zoom 12
  });
  const markersRef = useRef([]);
  const dragIndex = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [saveState, setSaveState] = useState({ busy: false, error: null, saved: null });

  // Debounced spot search for the picker.
  useEffect(() => {
    if (!query.trim()) return setResults([]);
    setSearching(true);
    const timer = setTimeout(() => {
      spotsApi
        .getSpots({ q: query.trim(), take: 8 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Ask the server for a route whenever the stop list changes.
  useEffect(() => {
    if (stops.length < 2) {
      setRoute(null);
      setRouteError(null);
      return;
    }
    let cancelled = false;
    crawlsApi
      .previewRoute(stops.map((s) => s.id))
      .then((r) => !cancelled && (setRoute(r), setRouteError(null)))
      .catch((err) => !cancelled && (setRoute(null), setRouteError(err.message)));
    return () => {
      cancelled = true;
    };
  }, [stops]);

  // Draw the stops and the route the server computed. Ordering comes straight
  // from the store, so dragging a stop redraws without re-routing here.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = stops.map((spot, i) => {
      const el = document.createElement('div');
      el.title = spot.name;
      el.className =
        'flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-accent text-xs font-semibold text-white shadow-card';
      el.textContent = String(i + 1);
      return new Marker({ element: el }).setLngLat([spot.lng, spot.lat]).addTo(map);
    });

    // The server's overview polyline follows real roads. Without it (routing
    // unconfigured, or fewer than two stops) fall back to a dashed connector.
    const routeLine = decodePolyline(route?.polyline);
    const line = routeLine.length ? routeLine : stops.map((s) => [s.lng, s.lat]);
    const data = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: stops.length >= 2 ? line : [] },
    };

    if (map.getSource(ROUTE_SOURCE)) {
      map.getSource(ROUTE_SOURCE).setData(data);
    } else {
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data });
      map.addLayer({
        id: ROUTE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ACCENT, 'line-width': 4 },
      });
    }
    map.setPaintProperty(ROUTE_LAYER, 'line-dasharray', routeLine.length ? null : [2, 2]);

    if (stops.length) {
      const bounds = new LngLatBounds();
      stops.forEach((s) => bounds.extend([s.lng, s.lat]));
      line.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
    }
  }, [ready, stops, route, mapRef]);

  const onDrop = useCallback(
    (toIndex) => {
      if (dragIndex.current != null && dragIndex.current !== toIndex) {
        moveStop(dragIndex.current, toIndex);
      }
      dragIndex.current = null;
    },
    [moveStop],
  );

  async function save() {
    setSaveState({ busy: true, error: null, saved: null });
    try {
      const { crawl } = await crawlsApi.createCrawl(title.trim(), stops.map((s) => s.id));
      setSaveState({ busy: false, error: null, saved: crawl });
      reset();
    } catch (err) {
      setSaveState({ busy: false, error: err.message, saved: null });
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--spacing-navbar)-3rem)] gap-6">
      <div className="flex w-96 shrink-0 flex-col">
        <h1 className="font-display text-xl font-bold">Food Crawl Planner</h1>
        <p className="text-sm text-muted">Add stops, drag to reorder, save the route.</p>

        <div className="relative mt-4">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spots to add…"
            aria-label="Search spots to add"
            className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        {query.trim() && (
          <div className="card mt-2 max-h-56 overflow-y-auto">
            {searching ? (
              <p className="p-3 text-center text-xs text-muted">Searching…</p>
            ) : results.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted">No spots found</p>
            ) : (
              results.map((spot) => {
                const added = stops.some((s) => s.id === spot.id);
                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => {
                      addStop(spot);
                      setQuery('');
                    }}
                    disabled={added}
                    className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-bg disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{spot.name}</p>
                      <p className="truncate text-xs text-muted">
                        {spot.cuisineType?.join(' · ')} · {priceLabel(spot.priceRange)}
                      </p>
                    </div>
                    {added && <span className="text-xs text-muted">Added</span>}
                  </button>
                );
              })
            )}
          </div>
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {stops.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-8 text-center">
              <RouteIcon size={20} className="text-muted" />
              <p className="text-sm font-medium">No stops yet</p>
              <p className="text-xs text-muted">Search above and add at least two spots.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {stops.map((spot, i) => (
                <li
                  key={spot.id}
                  draggable
                  onDragStart={() => {
                    dragIndex.current = i;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  className="card flex cursor-move items-center gap-2 p-2.5"
                >
                  <GripVertical size={15} className="shrink-0 text-muted" />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{spot.name}</p>
                    <p className="truncate text-xs text-muted">{spot.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStop(spot.id)}
                    aria-label={`Remove ${spot.name}`}
                    className="shrink-0 text-muted hover:text-ink"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        {stops.length >= 2 && (
          <div className="card mt-3 p-4">
            {route ? (
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-accent" />
                  {formatDistance(route.totalDistance)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-accent" />
                  {formatDuration(route.totalEta)}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted">
                {routeError ?? 'Calculating route…'}
                {routeError && ' — the crawl can still be saved without ETA.'}
              </p>
            )}

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name this crawl…"
              className="mt-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />

            <button
              type="button"
              onClick={save}
              disabled={!user || !title.trim() || saveState.busy}
              title={user ? undefined : 'Sign in to save a crawl'}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
            >
              <Save size={15} /> {saveState.busy ? 'Saving…' : 'Save crawl'}
            </button>

            {saveState.error && <p className="mt-2 text-xs text-red-600">{saveState.error}</p>}
          </div>
        )}

        {saveState.saved && (
          <p className="mt-2 rounded-lg bg-success-soft p-3 text-sm text-success">
            Saved “{saveState.saved.title}” — worth 3 points.
          </p>
        )}
      </div>

      {/* The canvas stays mounted so the map instance always has its container. */}
      <div className="card relative min-w-0 flex-1 overflow-hidden">
        {(!configured || mapsError) && (
          <div className="absolute inset-0 z-10 bg-surface">
            <MapNotice
              bare
              icon={RouteIcon}
              title="Route map needs a MapTiler API key"
              hint="Stops, ordering and ETA still work."
              error={mapsError}
            />
          </div>
        )}
        <div ref={mapEl} className="h-full w-full" />
      </div>
    </div>
  );
}
