import { useEffect, useRef, useState } from 'react';
import { Marker } from 'maplibre-gl';
import { Crosshair, Plus, X } from 'lucide-react';
import MapNotice from './MapNotice.jsx';
import { useMap, ACCENT, DEFAULT_CENTER } from '../hooks/useMap.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { CUISINES, DIETARY_TAGS, priceLabel } from '../utils/format.js';

const DAYS = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'],
  ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
];

const DEFAULT_DAY = { open: '09:00', close: '22:00' };

/** Field values for a spot that doesn't exist yet. */
export const BLANK_SPOT = {
  name: '',
  address: '',
  lat: DEFAULT_CENTER.lat,
  lng: DEFAULT_CENTER.lng,
  cuisineType: [],
  priceRange: 2,
  dietaryTags: [],
  photos: [],
  hours: null,
  claimOwnership: false,
};

/** Picks just the editable fields off a loaded spot, for the edit page. */
export function spotToFormValues(spot, userId) {
  return {
    name: spot.name,
    address: spot.address,
    lat: spot.lat,
    lng: spot.lng,
    cuisineType: spot.cuisineType ?? [],
    priceRange: spot.priceRange,
    dietaryTags: spot.dietaryTags ?? [],
    photos: spot.photos ?? [],
    hours: spot.hours ?? null,
    claimOwnership: Boolean(userId) && spot.ownerUserId === userId,
  };
}

const toggle = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const chip = (active) =>
  `rounded-full border px-3 py-1 text-xs transition-colors ${
    active ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-accent'
  }`;

const field =
  'mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none';

/**
 * The body shared by Add spot and Edit spot. Owns the field state; the page
 * supplies the starting values and decides what `onSubmit` does with them.
 * `onSubmit` may throw — the message is shown above the submit button.
 */
export default function SpotForm({ initial, submitLabel, busyLabel, onSubmit, footer }) {
  const [values, setValues] = useState(() => ({ ...BLANK_SPOT, ...initial }));
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (patch) => setValues((v) => ({ ...v, ...patch }));

  const lat = Number(values.lat);
  const lng = Number(values.lng);
  const coordsValid =
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  // Read by the map-setup effect, which must not re-run as the pin moves.
  const coordsRef = useRef({ lat, lng });
  if (coordsValid) coordsRef.current = { lat, lng };

  const mapEl = useRef(null);
  const markerRef = useRef(null);
  const { map: mapRef, ready, error: mapError, configured } = useMap(mapEl, {
    center: coordsRef.current,
    zoom: 14,
  });

  const { request: requestLocation, loading: locating, error: geoError } = useGeolocation();

  const moveTo = (next) =>
    set({ lat: Number(next.lat.toFixed(6)), lng: Number(next.lng.toFixed(6)) });

  // A draggable marker plus click-to-place; both write back into form state.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const marker = new Marker({ draggable: true, color: ACCENT })
      .setLngLat([coordsRef.current.lng, coordsRef.current.lat])
      .addTo(map);
    markerRef.current = marker;

    const onDragEnd = () => moveTo(marker.getLngLat());
    const onMapClick = (e) => moveTo(e.lngLat);
    marker.on('dragend', onDragEnd);
    map.on('click', onMapClick);

    return () => {
      map.off('click', onMapClick);
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once per map
  }, [ready, mapRef]);

  // Keeps the pin in step with the number inputs and the locate button.
  useEffect(() => {
    if (!coordsValid) return;
    markerRef.current?.setLngLat([lng, lat]);

    // Follow the pin when it lands off-screen, which is what typing a distant
    // coordinate does. A dragged pin is inside the view by definition, so this
    // stays quiet during a drag instead of yanking the map on every step.
    const map = mapRef.current;
    if (map && !map.getBounds().contains([lng, lat])) map.panTo([lng, lat]);
  }, [lat, lng, coordsValid, mapRef]);

  async function useMyLocation() {
    const next = await requestLocation();
    if (!next) return;
    moveTo(next);
    mapRef.current?.panTo([next.lng, next.lat]);
  }

  function addPhoto() {
    const url = photoUrl.trim();
    if (!url || values.photos.includes(url)) return;
    set({ photos: [...values.photos, url] });
    setPhotoUrl('');
  }

  function setDay(day, next) {
    set({ hours: { ...(values.hours ?? {}), [day]: next } });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        address: values.address.trim(),
        lat,
        lng,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const canSubmit =
    values.name.trim() && values.address.trim() && coordsValid && !submitting;

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="card space-y-4 p-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Name <span className="text-accent">*</span>
          </label>
          <input
            id="name"
            required
            maxLength={120}
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Corner House Ice Creams"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="address" className="text-sm font-medium">
            Address <span className="text-accent">*</span>
          </label>
          <input
            id="address"
            required
            value={values.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="Street, area, city"
            className={field}
          />
        </div>

        <div>
          <span className="text-sm font-medium">Price range</span>
          <div className="mt-1.5 flex gap-2">
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={values.priceRange === p}
                onClick={() => set({ priceRange: p })}
                className={chip(values.priceRange === p)}
              >
                {priceLabel(p)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Location</p>
            <p className="text-xs text-muted">
              Drag the pin or click the map. The numbers below always work.
            </p>
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent disabled:opacity-60"
          >
            <Crosshair size={13} /> {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>

        <div className="mt-3 h-64 overflow-hidden rounded-lg border border-line">
          {!configured || mapError ? (
            <MapNotice
              title="Map needs a MapTiler API key"
              hint="Set the pin with the coordinates below instead."
              error={mapError}
              bare
            />
          ) : null}
          <div ref={mapEl} className={`h-full w-full ${!configured || mapError ? 'hidden' : ''}`} />
        </div>

        {geoError && <p className="mt-2 text-xs text-red-600">{geoError}</p>}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lat" className="text-xs font-medium text-muted">
              Latitude
            </label>
            <input
              id="lat"
              type="number"
              step="any"
              required
              value={values.lat}
              onChange={(e) => set({ lat: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="lng" className="text-xs font-medium text-muted">
              Longitude
            </label>
            <input
              id="lng"
              type="number"
              step="any"
              required
              value={values.lng}
              onChange={(e) => set({ lng: e.target.value })}
              className={field}
            />
          </div>
        </div>

        {!coordsValid && (
          <p className="mt-2 text-xs text-red-600">
            Latitude must be between -90 and 90, longitude between -180 and 180.
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="card space-y-4 p-4">
        <div>
          <p className="text-sm font-medium">Cuisine</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={values.cuisineType.includes(c)}
                onClick={() => set({ cuisineType: toggle(values.cuisineType, c) })}
                className={chip(values.cuisineType.includes(c))}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Dietary options</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DIETARY_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={values.dietaryTags.includes(t)}
                onClick={() => set({ dietaryTags: toggle(values.dietaryTags, t) })}
                className={chip(values.dietaryTags.includes(t))}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Photos — URLs, matching what the API stores. */}
      <div className="card p-4">
        <p className="text-sm font-medium">Photos</p>
        <p className="text-xs text-muted">Paste image URLs. The first one becomes the header.</p>

        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            onKeyDown={(e) => {
              // Enter here means "add this photo", not "submit the form".
              if (e.key === 'Enter') {
                e.preventDefault();
                addPhoto();
              }
            }}
            placeholder="https://…"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={addPhoto}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-line px-3 text-xs hover:border-accent"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {values.photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {values.photos.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => set({ photos: values.photos.filter((p) => p !== url) })}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-ink p-0.5 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hours */}
      <div className="card p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.hours != null}
            onChange={(e) =>
              set({
                hours: e.target.checked
                  ? Object.fromEntries(DAYS.map(([day]) => [day, { ...DEFAULT_DAY }]))
                  : null,
              })
            }
            className="accent-[var(--color-accent)]"
          />
          Opening hours
        </label>

        {values.hours != null && (
          <ul className="mt-3 space-y-1.5">
            {DAYS.map(([day, label]) => {
              const value = values.hours[day];
              return (
                <li key={day} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-muted">{label}</span>
                  <input
                    type="checkbox"
                    aria-label={`${label} open`}
                    checked={Boolean(value)}
                    onChange={(e) => setDay(day, e.target.checked ? { ...DEFAULT_DAY } : null)}
                    className="accent-[var(--color-accent)]"
                  />
                  {value ? (
                    <>
                      <input
                        type="time"
                        aria-label={`${label} opens`}
                        value={value.open ?? ''}
                        onChange={(e) => setDay(day, { ...value, open: e.target.value })}
                        className="rounded-lg border border-line bg-bg px-2 py-1 text-xs focus:border-accent focus:outline-none"
                      />
                      <span className="text-xs text-muted">–</span>
                      <input
                        type="time"
                        aria-label={`${label} closes`}
                        value={value.close ?? ''}
                        onChange={(e) => setDay(day, { ...value, close: e.target.value })}
                        className="rounded-lg border border-line bg-bg px-2 py-1 text-xs focus:border-accent focus:outline-none"
                      />
                    </>
                  ) : (
                    <span className="text-xs text-muted">Closed</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <label className="card flex items-start gap-2.5 p-4 text-sm">
        <input
          type="checkbox"
          checked={values.claimOwnership}
          onChange={(e) => set({ claimOwnership: e.target.checked })}
          className="mt-0.5 accent-[var(--color-accent)]"
        />
        <span>
          I own or manage this place
          <span className="block text-xs text-muted">
            Owners can reply to reviews, and keep edit rights even after someone else adds a review.
          </span>
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 rounded-lg bg-accent py-3 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
        >
          {submitting ? busyLabel : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
