import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, MapPin, X } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import SpotCard from '../components/SpotCard.jsx';
import StarRating from '../components/StarRating.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { CUISINES, DIETARY_TAGS, formatDistance } from '../utils/format.js';

const PRICES = [1, 2, 3, 4];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { coords, error: geoError, loading: geoLoading, request } = useGeolocation();

  const [filters, setFilters] = useState({
    cuisine: [],
    dietary: [],
    price: [],
    minRating: 0,
    radius: 5000,
  });
  const [spots, setSpots] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });

  const query = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'rating';

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

  const activeCount =
    filters.cuisine.length + filters.dietary.length + filters.price.length + (filters.minRating ? 1 : 0);

  return (
    <div className="flex gap-6">
      <aside className="w-60 shrink-0 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <SlidersHorizontal size={16} /> Filters
          </h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters({ cuisine: [], dietary: [], price: [], minRating: 0, radius: 5000 })}
              className="text-xs text-accent hover:underline"
            >
              Clear ({activeCount})
            </button>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Cuisine</legend>
          <div className="flex flex-wrap gap-1.5">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle('cuisine', c)}
                aria-pressed={filters.cuisine.includes(c)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  filters.cuisine.includes(c)
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line hover:border-accent'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Price</legend>
          <div className="flex gap-1.5">
            {PRICES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggle('price', p)}
                aria-pressed={filters.price.includes(p)}
                className={`flex-1 rounded-lg border py-1.5 text-xs transition-colors ${
                  filters.price.includes(p)
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line hover:border-accent'
                }`}
              >
                {'$'.repeat(p)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Dietary needs</legend>
          <div className="space-y-1.5">
            {DIETARY_TAGS.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.dietary.includes(d)}
                  onChange={() => toggle('dietary', d)}
                  className="accent-[var(--color-accent)]"
                />
                {d}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Minimum rating</legend>
          <div className="flex items-center gap-2">
            <StarRating
              value={filters.minRating}
              onChange={(v) => setFilters((f) => ({ ...f, minRating: v === f.minRating ? 0 : v }))}
              size={18}
            />
            {filters.minRating > 0 && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, minRating: 0 }))}
                aria-label="Clear rating filter"
                className="text-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Distance</legend>
          {coords ? (
            <>
              <input
                type="range"
                min={500}
                max={25000}
                step={500}
                value={filters.radius}
                onChange={(e) => setFilters((f) => ({ ...f, radius: Number(e.target.value) }))}
                className="w-full accent-[var(--color-accent)]"
              />
              <p className="mt-1 text-xs text-muted">Within {formatDistance(filters.radius)}</p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={request}
                disabled={geoLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-xs hover:border-accent disabled:opacity-60"
              >
                <MapPin size={13} />
                {geoLoading ? 'Locating…' : 'Use my location'}
              </button>
              {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
            </>
          )}
        </fieldset>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">
              {query ? `Results for "${query}"` : 'All spots'}
            </h1>
            <p className="text-xs text-muted">
              {state.loading ? 'Searching…' : `${spots.length} spot${spots.length === 1 ? '' : 's'}`}
              {coords ? ' near you' : ''}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                next.set('sort', e.target.value);
                setParams(next);
              }}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
            >
              <option value="rating">Top rated</option>
              <option value="reviews">Most reviewed</option>
              <option value="newest">Newest</option>
              <option value="distance" disabled={!coords}>
                Nearest{coords ? '' : ' (needs location)'}
              </option>
            </select>
          </label>
        </div>

        {state.loading ? (
          <Spinner />
        ) : state.error ? (
          <ErrorState error={state.error} onRetry={search} />
        ) : spots.length === 0 ? (
          <EmptyState
            title="No spots match those filters"
            hint="Try removing a filter or widening the distance radius."
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {spots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
