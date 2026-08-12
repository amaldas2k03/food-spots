import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, GripVertical, X, Route as RouteIcon, Save, Clock, MapPin } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import * as crawlsApi from '../api/crawls.js';
import { useCrawlStore } from '../store/crawlStore.js';
import { useAuthStore } from '../store/authStore.js';
import { useGoogleMaps, MAP_STYLE, DEFAULT_CENTER } from '../hooks/useGoogleMaps.js';
import { formatDistance, formatDuration, priceLabel } from '../utils/format.js';

export default function CrawlPlanner() {
  const user = useAuthStore((s) => s.user);
  const { stops, title, setTitle, addStop, removeStop, moveStop, reset } = useCrawlStore();
  const { ready, configured, error: mapsError } = useGoogleMaps();

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const rendererRef = useRef(null);
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

  useEffect(() => {
    if (!ready || !mapEl.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapEl.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      styles: MAP_STYLE,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    rendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      polylineOptions: { strokeColor: '#E07B39', strokeWeight: 4 },
    });
  }, [ready]);

  // Draw the route client-side; the server response gives us the totals.
  useEffect(() => {
    if (!ready || !rendererRef.current || stops.length < 2) {
      rendererRef.current?.setDirections({ routes: [] });
      return;
    }

    new window.google.maps.DirectionsService().route(
      {
        origin: { lat: stops[0].lat, lng: stops[0].lng },
        destination: { lat: stops.at(-1).lat, lng: stops.at(-1).lng },
        waypoints: stops.slice(1, -1).map((s) => ({
          location: { lat: s.lat, lng: s.lng },
          stopover: true,
        })),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') rendererRef.current.setDirections(result);
      },
    );
  }, [ready, stops]);

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

      <div className="card min-w-0 flex-1 overflow-hidden">
        {!configured || mapsError ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <RouteIcon size={24} className="mx-auto text-accent" />
              <p className="mt-2 font-medium">Route map needs a Google Maps API key</p>
              <p className="mt-1 text-sm text-muted">
                Set <code className="rounded bg-bg px-1">VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
                <code className="rounded bg-bg px-1">client/.env</code>. Stops and ordering still work.
              </p>
            </div>
          </div>
        ) : (
          <div ref={mapEl} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
