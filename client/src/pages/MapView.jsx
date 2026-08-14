import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Marker } from 'maplibre-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Flame, Pin, List as ListIcon, Map as MapIcon, X } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import StarRating from '../components/StarRating.jsx';
import MapNotice from '../components/MapNotice.jsx';
import { EmptyState } from '../components/Feedback.jsx';
import { Bleed, Button, IconButton, Tag, Skeleton } from '../components/ui/index.js';
import { useMap, DEFAULT_CENTER } from '../hooks/useMap.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useIsDesktop } from '../hooks/useMediaQuery.js';
import { priceLabel, formatDistance } from '../utils/format.js';
import { topVibe } from '../utils/vibes.js';
import { settle, snap } from '../motion/index.js';

const SPOTS_SOURCE = 'spots';
const HEATMAP_LAYER = 'spots-heatmap';

/** Teardrop pin, built as markup because MapLibre owns these nodes. */
const PIN_SVG = `
  <svg width="26" height="34" viewBox="0 0 26 34" fill="none" aria-hidden="true">
    <path d="M13 33S25 21.5 25 13A12 12 0 1 0 1 13c0 8.5 12 20 12 20Z"
          fill="var(--color-accent)" stroke="white" stroke-width="2.5"/>
    <circle cx="13" cy="13" r="4.2" fill="white"/>
  </svg>`;

/**
 * A spot in the side list. Hovering it activates the matching map pin, which
 * is the whole point of showing a map and a list at the same time — otherwise
 * they're two unrelated views of the same query.
 */
function SpotListItem({ spot, selected, onSelect, onHover }) {
  const vibe = topVibe(spot);

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(spot)}
      onMouseEnter={() => onHover(spot.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(spot.id)}
      onBlur={() => onHover(null)}
      className={`flex w-full cursor-pointer gap-3 p-3 text-left transition-colors ${
        selected ? 'bg-accent-soft' : 'hover:bg-accent-soft/50'
      }`}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      transition={snap}
    >
      {spot.photos?.[0] && (
        <img
          src={spot.photos[0]}
          alt=""
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold">{spot.name}</p>
        <p className="truncate text-xs text-muted">
          {spot.cuisineType?.join(' · ')} · {priceLabel(spot.priceRange)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StarRating value={spot.overallRating} size={12} showValue label={`${spot.name} rating`} />
          {spot.distance != null && (
            <span className="text-xs text-muted">{formatDistance(spot.distance)}</span>
          )}
          {vibe && <Tag tone="olive">{vibe.label}</Tag>}
        </div>
      </div>
    </motion.button>
  );
}

function SelectedPanel({ spot, onClose }) {
  return (
    <motion.div
      className="p-4"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={settle}
    >
      {spot.photos?.[0] && (
        <img
          src={spot.photos[0]}
          alt={spot.name}
          className="aspect-video w-full rounded-panel object-cover"
        />
      )}
      <h3 className="mt-3 font-display text-xl font-semibold">{spot.name}</h3>
      <p className="label-caps mt-1 text-muted">
        {spot.cuisineType?.join(' · ')} · {priceLabel(spot.priceRange)}
      </p>
      <div className="mt-2">
        <StarRating value={spot.overallRating} showValue label="Rating" />
      </div>
      <p className="mt-2 text-sm text-muted">{spot.address}</p>
      <Button to={`/spots/${spot.id}`} block className="mt-4">
        View details
      </Button>
      <Button variant="quiet" size="sm" block className="mt-1.5" onClick={onClose}>
        Back to all spots
      </Button>
    </motion.div>
  );
}

export default function MapView() {
  const { coords, request, loading: geoLoading } = useGeolocation();
  const isDesktop = useIsDesktop();

  const mapEl = useRef(null);
  const { map: mapRef, ready, error: mapsError, configured } = useMap(mapEl, {
    center: DEFAULT_CENTER,
    zoom: 12, // same city-wide framing as the previous Google zoom 13
  });
  const markersRef = useRef([]);
  const markerElsRef = useRef(new Map());

  const [spots, setSpots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [radius, setRadius] = useState(5000);
  const [mode, setMode] = useState('pins'); // 'pins' | 'heatmap'
  const [view, setView] = useState('map'); // mobile only: 'map' | 'list'
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
    markerElsRef.current.clear();
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
            'heatmap-radius': 40,
            'heatmap-intensity': 1,
            'heatmap-opacity': 0.8,
            /*
             * Re-graded from the stock cyan→blue→red ramp onto the app's warm
             * palette. The old ramp put cold blues over a cream, terracotta UI
             * and read as a different product bolted on; this runs olive →
             * amber → terracotta, so density still climbs in both hue and
             * luminance (it stays readable in greyscale) without leaving the
             * palette.
             */
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(238,241,230,0)',
              0.12, 'rgba(184,199,163,0.75)',
              0.32, 'rgba(233,196,106,0.85)',
              0.55, 'rgba(224,142,58,0.9)',
              0.78, 'rgba(194,65,12,0.94)',
              1, 'rgba(122,32,10,0.97)',
            ],
          },
        });
      }
    } else {
      if (map.getLayer(HEATMAP_LAYER)) map.removeLayer(HEATMAP_LAYER);

      markersRef.current = spots.map((spot, i) => {
        /*
         * Two elements, not one, and the split matters. MapLibre treats the
         * element you hand it as its own positioning container and writes
         * `transform: translate(...)` to it inline on every frame — so any
         * transform of ours on that node is overwritten and the highlight
         * silently does nothing. The outer div is MapLibre's to move; the
         * inner button is ours to scale.
         */
        const anchor = document.createElement('div');
        anchor.className = 'spot-pin-anchor';

        const el = document.createElement('button');
        el.type = 'button';
        el.title = spot.name;
        el.setAttribute('aria-label', spot.name);
        el.className = 'spot-pin cursor-pointer';
        el.innerHTML = PIN_SVG;
        // Stagger the drop so a hundred pins arrive as a sweep across the map
        // rather than all at once. Capped so the last pin isn't a second late.
        el.style.animationDelay = `${Math.min(i * 12, 600)}ms`;
        el.addEventListener('click', () => {
          setSelected(spot);
          map.panTo([spot.lng, spot.lat]);
        });

        anchor.appendChild(el);
        markerElsRef.current.set(spot.id, anchor);
        return new Marker({ element: anchor, anchor: 'bottom' })
          .setLngLat([spot.lng, spot.lat])
          .addTo(map);
      });
    }

    return clearMarkers;
  }, [ready, spots, mode, clearMarkers, mapRef]);

  /*
   * Link the list to the map. This writes an attribute straight to the marker
   * node rather than re-rendering: the markers aren't React's to manage, and
   * re-creating them on every hover would tear down and rebuild a hundred DOM
   * nodes for a cursor moving down a list.
   */
  useEffect(() => {
    const activeId = hovered ?? selected?.id ?? null;
    markerElsRef.current.forEach((el, id) => {
      el.dataset.active = String(id === activeId);
    });
  }, [hovered, selected]);

  // Recentre when the user shares their location.
  useEffect(() => {
    if (coords && mapRef.current) mapRef.current.panTo([coords.lng, coords.lat]);
  }, [coords, mapRef]);

  // The map canvas is sized by its container; when the mobile view toggles
  // between map and list, MapLibre has to be told the box changed.
  useEffect(() => {
    if (ready) requestAnimationFrame(() => mapRef.current?.resize());
  }, [view, isDesktop, ready, mapRef]);

  const listContent = loading ? (
    <div className="space-y-3 p-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-16 w-16 shrink-0" rounded="rounded-xl" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  ) : selected ? (
    <AnimatePresence mode="wait">
      <SelectedPanel key={selected.id} spot={selected} onClose={() => setSelected(null)} />
    </AnimatePresence>
  ) : spots.length === 0 ? (
    <div className="p-4">
      <EmptyState
        art="search"
        title="Nothing in range"
        hint="Widen the radius, or drop the location filter to see everything."
      />
    </div>
  ) : (
    <ul className="divide-y divide-line">
      {spots.map((spot) => (
        <li key={spot.id}>
          <SpotListItem
            spot={spot}
            selected={selected?.id === spot.id}
            onSelect={(s) => {
              setSelected(s);
              mapRef.current?.panTo([s.lng, s.lat]);
              if (!isDesktop) setView('map');
            }}
            onHover={setHovered}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <Bleed flush flushBottom>
      {/* On a phone the bottom nav overlays the viewport, so its height comes
          out of the map's — otherwise the floating switch and the sheet's
          bottom edge sit underneath it. */}
      <div className="relative flex h-[calc(100vh-var(--spacing-navbar)-var(--spacing-bottomnav))] flex-col md:h-[calc(100vh-var(--spacing-navbar))] md:flex-row">
        {/* ─── Map ──────────────────────────────────────────────────────── */}
        <div className="relative min-h-0 flex-1">
          {!configured || mapsError ? (
            <div className="absolute inset-0 z-10 bg-bg">
              <MapNotice
                title="Map needs a MapTiler API key"
                hint="The spot list still works without it."
                error={mapsError}
              />
            </div>
          ) : !ready ? (
            <div className="absolute inset-0 z-10 bg-bg">
              <Skeleton className="h-full w-full" rounded="rounded-none" />
            </div>
          ) : null}

          <div ref={mapEl} className="h-full w-full" />

          {/* Pins / heatmap toggle. The active pill is a shared element that
              slides between the two options. */}
          <div className="absolute top-4 left-4 flex overflow-hidden rounded-chip bg-surface/95 p-1 shadow-[var(--shadow-card)] backdrop-blur-sm">
            {[
              { id: 'pins', label: 'Pins', icon: Pin },
              { id: 'heatmap', label: 'Heatmap', icon: Flame },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                className={`relative flex min-h-9 cursor-pointer items-center gap-1.5 rounded-chip px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  mode === id ? 'text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {mode === id && (
                  <motion.span
                    layoutId="map-mode-pill"
                    className="absolute inset-0 rounded-chip bg-accent"
                    transition={settle}
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon size={13} aria-hidden /> {label}
                </span>
              </button>
            ))}
          </div>

          {/* Radius control sits above the mobile sheet, out of its way. */}
          <div className="absolute top-4 right-4 w-52 rounded-card bg-surface/95 p-3 shadow-[var(--shadow-card)] backdrop-blur-sm md:top-auto md:bottom-4 md:left-4 md:w-64">
            {coords ? (
              <>
                <label htmlFor="radius" className="text-xs font-semibold">
                  Within {formatDistance(radius)}
                </label>
                <input
                  id="radius"
                  type="range"
                  min={500}
                  max={25000}
                  step={500}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--color-accent)]"
                />
              </>
            ) : (
              <Button size="sm" icon={MapPin} onClick={request} disabled={geoLoading} block>
                {geoLoading ? 'Locating…' : 'Search near me'}
              </Button>
            )}
          </div>
        </div>

        {/* ─── Desktop list rail ────────────────────────────────────────── */}
        <aside className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-line bg-surface md:block">
          <div className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-3">
            <h2 className="font-display text-lg font-semibold">
              {selected ? 'Selected spot' : `${spots.length} spot${spots.length === 1 ? '' : 's'}`}
            </h2>
            <p className="text-xs text-muted">
              {selected ? 'Press escape to go back' : 'Hover a spot to find it on the map'}
            </p>
          </div>
          {listContent}
        </aside>

        {/*
          ─── Mobile sheet ───────────────────────────────────────────────
          A phone can't afford a permanent side panel, so the list becomes a
          sheet over the map. It's draggable, and the map keeps its full height
          underneath — so panning to a pin and reading its entry never means
          losing sight of one or the other.
        */}
        <AnimatePresence>
          {view === 'list' && (
            <motion.div
              className="absolute inset-x-0 bottom-0 z-20 flex max-h-[72%] flex-col rounded-t-panel bg-surface shadow-[var(--shadow-panel)] md:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={settle}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 550) setView('map');
              }}
              role="dialog"
              aria-label="Spot list"
            >
              <div className="flex justify-center pt-3 pb-1" aria-hidden>
                <span className="h-1.5 w-11 rounded-full bg-line-strong" />
              </div>
              <div className="flex items-center justify-between px-4 pb-2">
                <h2 className="font-display text-lg font-semibold">
                  {spots.length} spot{spots.length === 1 ? '' : 's'} nearby
                </h2>
                <IconButton
                  icon={X}
                  label="Close list"
                  size={40}
                  variant="quiet"
                  onClick={() => setView('map')}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pb-4">{listContent}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile map/list switch, floating clear of the bottom nav. */}
        <motion.div
          className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 md:hidden"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...settle, delay: 0.2 }}
        >
          <Button
            onClick={() => setView((v) => (v === 'map' ? 'list' : 'map'))}
            icon={view === 'map' ? ListIcon : MapIcon}
            className="shadow-[var(--shadow-lift)]"
          >
            {view === 'map' ? `Show ${spots.length} spots` : 'Show map'}
          </Button>
        </motion.div>
      </div>
    </Bleed>
  );
}
