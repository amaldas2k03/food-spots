import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navigation, Bookmark, Share2, Clock, PenLine, Check, Pencil, Trash2 } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import * as reviewsApi from '../api/reviews.js';
import * as listsApi from '../api/lists.js';
import StarRating from '../components/StarRating.jsx';
import DishCard from '../components/DishCard.jsx';
import ReviewCard from '../components/ReviewCard.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { useAuthStore } from '../store/authStore.js';
import { priceLabel, isOpenNow } from '../utils/format.js';
import { canEditSpot } from '../utils/permissions.js';

function SaveToListMenu({ spotId, onClose }) {
  const [lists, setLists] = useState(null);
  const [status, setStatus] = useState({});

  useEffect(() => {
    listsApi.getLists().then(setLists).catch(() => setLists([]));
  }, []);

  async function save(list) {
    setStatus((s) => ({ ...s, [list.id]: 'saving' }));
    try {
      await listsApi.addSpotToList(list.id, spotId);
      setStatus((s) => ({ ...s, [list.id]: 'saved' }));
    } catch (err) {
      setStatus((s) => ({ ...s, [list.id]: err.message }));
    }
  }

  return (
    <div className="card absolute right-0 z-30 mt-2 max-h-72 w-64 overflow-y-auto p-1">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold">Save to list</span>
        <button type="button" onClick={onClose} className="text-xs text-muted hover:text-ink">
          Close
        </button>
      </div>

      {lists === null ? (
        <p className="px-3 py-4 text-center text-xs text-muted">Loading…</p>
      ) : lists.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-muted">
          No lists yet.{' '}
          <Link to="/lists" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      ) : (
        lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => save(list)}
            disabled={status[list.id] === 'saved'}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-bg disabled:opacity-60"
          >
            <span className="truncate">{list.title}</span>
            {status[list.id] === 'saved' && <Check size={14} className="text-success" />}
            {status[list.id] === 'saving' && <span className="text-xs text-muted">…</span>}
          </button>
        ))
      )}
    </div>
  );
}

export default function SpotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [spot, setSpot] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('reviews');
  const [state, setState] = useState({ loading: true, error: null });
  const [saveOpen, setSaveOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState({ busy: false, error: null });

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const [s, r] = await Promise.all([spotsApi.getSpot(id), reviewsApi.getReviews(id)]);
      setSpot(s);
      setReviews(r);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: err });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} onRetry={load} />;
  if (!spot) return null;

  const open = isOpenNow(spot.hours);
  const isOwner = user && spot.ownerUserId === user.id;
  const canEdit = canEditSpot(spot, user);
  const alreadyReviewed = reviews.some((r) => r.user?.id === user?.id);
  // _count comes from the detail query; reviewCount is the denormalised column.
  const reviewCount = spot._count?.reviews ?? spot.reviewCount ?? 0;

  async function share() {
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  async function remove() {
    setDeleting({ busy: true, error: null });
    try {
      await spotsApi.deleteSpot(spot.id);
      navigate('/map', { replace: true });
    } catch (err) {
      // Reviews may have landed since the page loaded, in which case the
      // server refuses with 409 even though the button looked enabled.
      setDeleting({ busy: false, error: err.message });
      setConfirmDelete(false);
    }
  }

  return (
    <div>
      {spot.photos?.[0] && (
        <img
          src={spot.photos[0]}
          alt={spot.name}
          className="mb-6 aspect-[21/9] w-full rounded-xl object-cover"
        />
      )}

      <div className="flex gap-6">
        <div className="min-w-0 flex-[3]">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{spot.name}</h1>
              {open !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    open ? 'bg-success-soft text-success' : 'bg-line text-muted'
                  }`}
                >
                  {open ? 'Open now' : 'Closed'}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-muted">
              {spot.cuisineType?.join(' · ')} · {priceLabel(spot.priceRange)}
            </p>

            {spot.dietaryTags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {spot.dietaryTags.map((t) => (
                  <span key={t} className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <StarRating value={spot.overallRating} size={18} showValue />
              <span className="text-sm text-muted">
                {spot.reviewCount} review{spot.reviewCount === 1 ? '' : 's'}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted">{spot.address}</p>
          </header>

          <nav className="mt-6 flex gap-1 border-b border-line" role="tablist">
            {['reviews', 'dishes'].map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {t} ({t === 'reviews' ? reviews.length : spot.dishes?.length ?? 0})
              </button>
            ))}
          </nav>

          <div className="mt-4">
            {tab === 'dishes' ? (
              spot.dishes?.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {spot.dishes.map((dish) => (
                    <DishCard key={dish.id} dish={dish} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No dishes listed yet" hint="Dishes appear here once they're added." />
              )
            ) : reviews.length ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    canRespond={isOwner}
                    onResponded={(reviewId, ownerResponse) =>
                      setReviews((rs) =>
                        rs.map((r) => (r.id === reviewId ? { ...r, ownerResponse } : r)),
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No reviews yet"
                hint="Be the first to say something about this place."
              />
            )}
          </div>
        </div>

        <aside className="w-72 shrink-0 space-y-3">
          <div className="card space-y-2 p-4">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-dark"
            >
              <Navigation size={15} /> Get directions
            </a>

            <div className="relative">
              <button
                type="button"
                onClick={() => (user ? setSaveOpen((v) => !v) : null)}
                disabled={!user}
                title={user ? 'Save to a list' : 'Sign in to save spots'}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm hover:border-accent disabled:opacity-50"
              >
                <Bookmark size={15} /> Save to list
              </button>
              {saveOpen && <SaveToListMenu spotId={spot.id} onClose={() => setSaveOpen(false)} />}
            </div>

            <button
              type="button"
              onClick={share}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm hover:border-accent"
            >
              <Share2 size={15} /> {shared ? 'Link copied' : 'Share'}
            </button>

            {user && !alreadyReviewed && (
              <Link
                to={`/spots/${spot.id}/review/new`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent-soft"
              >
                <PenLine size={15} /> Write a review
              </Link>
            )}
          </div>

          {canEdit && (
            <div className="card space-y-2 p-4">
              <p className="text-xs font-medium text-muted">
                {isOwner ? 'You own this spot' : 'You added this spot'}
              </p>

              <Link
                to={`/spots/${spot.id}/edit`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm hover:border-accent"
              >
                <Pencil size={15} /> Edit spot
              </Link>

              {confirmDelete ? (
                <>
                  <p className="text-xs text-muted">
                    Delete “{spot.name}” for everyone? This can't be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={remove}
                      disabled={deleting.busy}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleting.busy ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-line px-3 py-2 text-sm hover:border-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={reviewCount > 0}
                  title={
                    reviewCount > 0
                      ? 'Spots with reviews cannot be deleted'
                      : 'Delete this spot'
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm text-red-600 hover:border-red-600 disabled:opacity-50 disabled:hover:border-line"
                >
                  <Trash2 size={15} /> Delete spot
                </button>
              )}

              {reviewCount > 0 && !confirmDelete && (
                <p className="text-xs text-muted">
                  Deleting would take its reviews and dishes with it, so spots with reviews stay
                  put. You can still edit this one.
                </p>
              )}

              {deleting.error && <p className="text-xs text-red-600">{deleting.error}</p>}
            </div>
          )}

          {/* Static map preview keeps this panel useful without loading the full JS API. */}
          <div className="card overflow-hidden">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-video items-center justify-center bg-accent-soft text-sm text-accent hover:underline"
            >
              <Navigation size={16} className="mr-1.5" />
              {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
            </a>
          </div>

          {spot.hours && (
            <div className="card p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Clock size={14} /> Hours
              </h3>
              <dl className="mt-2 space-y-1 text-xs">
                {Object.entries(spot.hours).map(([day, h]) => (
                  <div key={day} className="flex justify-between">
                    <dt className="capitalize text-muted">{day}</dt>
                    <dd>{h?.open && h?.close ? `${h.open} – ${h.close}` : 'Closed'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
