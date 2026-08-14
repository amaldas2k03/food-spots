import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, MapPin, X, RotateCcw } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import SpotCard from '../components/SpotCard.jsx';
import StarRating from '../components/StarRating.jsx';
import { ErrorState, EmptyState } from '../components/Feedback.jsx';
import {
  Button,
  Chip,
  Drawer,
  Reveal,
  RevealItem,
  SpotGridSkeleton,
} from '../components/ui/index.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useIsDesktop } from '../hooks/useMediaQuery.js';
import { useAuthStore } from '../store/authStore.js';
import { useSavedStore } from '../store/savedStore.js';
import { CUISINES, DIETARY_TAGS, formatDistance } from '../utils/format.js';
import { VIBES, matchesVibes } from '../utils/vibes.js';
import { settle, snap } from '../motion/index.js';

const PRICES = [1, 2, 3, 4];
const EMPTY = { cuisine: [], dietary: [], price: [], vibe: [], minRating: 0, radius: 5000 };

/**
 * A collapsible filter group.
 *
 * Height animation is the one place worth breaking the transform-only rule:
 * there's no way to reveal unknown-height content without it. It's scoped to a
 * single group the user just clicked, animating one subtree rather than the
 * page, so the layout cost is bounded and paid only on an explicit action.
 */
function FilterGroup({ legend, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <fieldset className="border-b border-line pb-4">
      <legend className="sr-only">{legend}</legend>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between py-2 text-left"
      >
        <span className="label-caps text-ink">{legend}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={snap} className="text-muted">
          <X size={15} aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={settle}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
}

function FilterPanel({ filters, setFilters, toggle, coords, geoLoading, geoError, request }) {
  return (
    <div className="space-y-4">
      <FilterGroup legend="Vibe">
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <Chip
              key={v.id}
              tone="olive"
              selected={filters.vibe.includes(v.id)}
              onToggle={() => toggle('vibe', v.id)}
            >
              {v.label}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Vibes are worked out from ratings, price and opening hours — not typed in by anyone.
        </p>
      </FilterGroup>

      <FilterGroup legend="Cuisine">
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <Chip key={c} selected={filters.cuisine.includes(c)} onToggle={() => toggle('cuisine', c)}>
              {c}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup legend="Price">
        <div className="flex gap-2">
          {PRICES.map((p) => (
            <motion.button
              key={p}
              type="button"
              onClick={() => toggle('price', p)}
              aria-pressed={filters.price.includes(p)}
              className={`min-h-11 flex-1 cursor-pointer rounded-xl border text-sm font-semibold transition-colors ${
                filters.price.includes(p)
                  ? 'border-accent bg-accent-soft text-accent-dark'
                  : 'border-line text-muted hover:border-accent'
              }`}
              whileTap={{ scale: 0.94 }}
              transition={snap}
            >
              {'$'.repeat(p)}
            </motion.button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup legend="Dietary needs">
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map((d) => (
            <Chip
              key={d}
              selected={filters.dietary.includes(d)}
              onToggle={() => toggle('dietary', d)}
            >
              {d}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup legend="Minimum rating">
        <div className="flex items-center gap-3">
          <StarRating
            value={filters.minRating}
            onChange={(v) => setFilters((f) => ({ ...f, minRating: v === f.minRating ? 0 : v }))}
            size={22}
            label="Minimum rating"
          />
          {filters.minRating > 0 && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, minRating: 0 }))}
              className="cursor-pointer text-xs text-muted hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
      </FilterGroup>

      <FilterGroup legend="Distance">
        {coords ? (
          <>
            <input
              type="range"
              min={500}
              max={25000}
              step={500}
              value={filters.radius}
              onChange={(e) => setFilters((f) => ({ ...f, radius: Number(e.target.value) }))}
              aria-label="Search radius"
              className="w-full accent-[var(--color-accent)]"
            />
            <p className="mt-1.5 text-xs text-muted">Within {formatDistance(filters.radius)}</p>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={MapPin}
              onClick={request}
              disabled={geoLoading}
              block
            >
              {geoLoading ? 'Locating…' : 'Use my location'}
            </Button>
            {geoError && (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {geoError}
              </p>
            )}
          </>
        )}
      </FilterGroup>
    </div>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { coords, error: geoError, loading: geoLoading, request } = useGeolocation();
  const isDesktop = useIsDesktop();
  const user = useAuthStore((s) => s.user);
  const initSaved = useSavedStore((s) => s.init);

  // A vibe can arrive from the landing page's mood chips.
  const [filters, setFilters] = useState(() => ({
    ...EMPTY,
    vibe: params.get('vibe') ? [params.get('vibe')] : [],
  }));
  const [spots, setSpots] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'rating';

  useEffect(() => {
    if (user) initSaved();
  }, [user, initSaved]);

  const toggle = (key, value) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const search = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const result = await spotsApi.getSpots({
        q: query || undefined,
        sort,
        cuisine: filters.cuisine.length ? filters.cuisine.join(',') : undefined,
        dietary: filters.dietary.length ? filters.dietary.join(',') : undefined,
        price: filters.price.length ? filters.price.join(',') : undefined,
        minRating: filters.minRating || undefined,
        // Distance filters only apply once we actually have coordinates.
        ...(coords ? { lat: coords.lat, lng: coords.lng, radius: filters.radius } : {}),
      });
      setSpots(result);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: err });
    }
  }, [query, sort, filters, coords]);

  useEffect(() => {
    search();
  }, [search]);

  /*
   * Vibes are derived client-side (there's no column for them), so they're
   * applied to the results the server returned rather than sent as a query
   * param — which would silently do nothing.
   */
  const visible = useMemo(
    () => spots.filter((s) => matchesVibes(s, filters.vibe)),
    [spots, filters.vibe],
  );

  const activeCount =
    filters.cuisine.length +
    filters.dietary.length +
    filters.price.length +
    filters.vibe.length +
    (filters.minRating ? 1 : 0);

  /** Removable summary of everything currently narrowing the results. */
  const activeChips = [
    ...filters.vibe.map((v) => ({
      key: `vibe-${v}`,
      label: VIBES.find((x) => x.id === v)?.label ?? v,
      remove: () => toggle('vibe', v),
    })),
    ...filters.cuisine.map((c) => ({
      key: `cuisine-${c}`,
      label: c,
      remove: () => toggle('cuisine', c),
    })),
    ...filters.price.map((p) => ({
      key: `price-${p}`,
      label: '$'.repeat(p),
      remove: () => toggle('price', p),
    })),
    ...filters.dietary.map((d) => ({
      key: `dietary-${d}`,
      label: d,
      remove: () => toggle('dietary', d),
    })),
    ...(filters.minRating
      ? [
          {
            key: 'rating',
            label: `${filters.minRating}★ and up`,
            remove: () => setFilters((f) => ({ ...f, minRating: 0 })),
          },
        ]
      : []),
  ];

  const panel = (
    <FilterPanel
      filters={filters}
      setFilters={setFilters}
      toggle={toggle}
      coords={coords}
      geoLoading={geoLoading}
      geoError={geoError}
      request={request}
    />
  );

  return (
    <div className="flex gap-8">
      {/* Desktop filter rail. On mobile the identical panel is in a drawer. */}
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-[calc(var(--spacing-navbar)+1.5rem)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <SlidersHorizontal size={16} aria-hidden /> Filters
            </h2>
            <AnimatePresence>
              {activeCount > 0 && (
                <motion.button
                  type="button"
                  onClick={() => setFilters(EMPTY)}
                  className="flex cursor-pointer items-center gap-1 text-xs text-accent hover:underline"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={snap}
                >
                  <RotateCcw size={12} aria-hidden /> Clear {activeCount}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          {panel}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="label-caps mb-2 text-ember">
              {query ? 'Search results' : 'The whole collection'}
            </p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {query ? `“${query}”` : 'All spots'}
            </h1>
            <p className="mt-1 text-sm text-muted" aria-live="polite">
              {state.loading
                ? 'Looking…'
                : `${visible.length} spot${visible.length === 1 ? '' : 's'}`}
              {coords ? ' near you' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only sm:not-sr-only sm:text-muted">Sort</span>
              <select
                value={sort}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  next.set('sort', e.target.value);
                  setParams(next);
                }}
                className="min-h-11 cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="rating">Top rated</option>
                <option value="reviews">Most reviewed</option>
                <option value="newest">Newest</option>
                <option value="distance" disabled={!coords}>
                  Nearest{coords ? '' : ' (needs location)'}
                </option>
              </select>
            </label>

            <Button
              variant="secondary"
              icon={SlidersHorizontal}
              onClick={() => setDrawerOpen(true)}
              className="md:hidden"
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          </div>
        </div>

        {/* Active filters. They animate in and out so removing one reads as a
            physical change to the query, not a silent re-render. */}
        {activeChips.length > 0 && (
          <motion.ul layout className="mb-5 flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {activeChips.map((chip) => (
                <motion.li
                  key={chip.key}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={snap}
                >
                  <button
                    type="button"
                    onClick={chip.remove}
                    className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-chip bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-dark hover:bg-accent hover:text-white"
                  >
                    {chip.label}
                    <X size={13} aria-hidden />
                    <span className="sr-only">Remove filter</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        {state.loading ? (
          <SpotGridSkeleton count={6} />
        ) : state.error ? (
          <ErrorState error={state.error} onRetry={search} />
        ) : visible.length === 0 ? (
          <EmptyState
            art="search"
            title="Nothing matches all of that"
            hint={
              activeCount > 0
                ? 'That combination is a bit tight. Drop a filter and see what turns up.'
                : 'Try a different search term, or browse the map instead.'
            }
            action={
              activeCount > 0 ? (
                <Button icon={RotateCcw} onClick={() => setFilters(EMPTY)}>
                  Clear filters
                </Button>
              ) : (
                <Button to="/map">Open the map</Button>
              )
            }
          />
        ) : (
          <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
            {visible.map((spot) => (
              <RevealItem key={spot.id}>
                <SpotCard spot={spot} />
              </RevealItem>
            ))}
          </Reveal>
        )}
      </div>

      {/* Mobile filters — same panel, delivered as a thumb-reachable sheet. */}
      {!isDesktop && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Filters"
          description={`${visible.length} spot${visible.length === 1 ? '' : 's'} match`}
          footer={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setFilters(EMPTY)}
                disabled={activeCount === 0}
                className="flex-1"
              >
                Clear all
              </Button>
              <Button onClick={() => setDrawerOpen(false)} className="flex-1">
                Show {visible.length} result{visible.length === 1 ? '' : 's'}
              </Button>
            </div>
          }
        >
          {panel}
        </Drawer>
      )}
    </div>
  );
}
