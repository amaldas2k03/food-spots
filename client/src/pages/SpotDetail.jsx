import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Navigation,
  Share2,
  Clock,
  PenLine,
  Check,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import * as reviewsApi from '../api/reviews.js';
import * as listsApi from '../api/lists.js';
import StarRating from '../components/StarRating.jsx';
import DishCard from '../components/DishCard.jsx';
import ReviewCard from '../components/ReviewCard.jsx';
import { ErrorState, EmptyState } from '../components/Feedback.jsx';
import {
  Bleed,
  Button,
  IconButton,
  Tag,
  Drawer,
  SaveButton,
  Skeleton,
  ReviewSkeleton,
} from '../components/ui/index.js';
import { useAuthStore } from '../store/authStore.js';
import { useSavedStore } from '../store/savedStore.js';
import { priceLabel, isOpenNow } from '../utils/format.js';
import { vibesFor } from '../utils/vibes.js';
import { canEditSpot } from '../utils/permissions.js';
import { settle, snap, useMotionSafe, useParallaxRange } from '../motion/index.js';

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'%3E%3Crect width='1200' height='800' fill='%23FBEDE4'/%3E%3C/svg%3E";

/**
 * Swipeable hero gallery.
 *
 * On a phone this is the primary control: drag the image and it follows your
 * thumb, then settles to the nearest slide on release. A 60px throw or a fast
 * flick advances — matching the physics of every native photo viewer, so
 * nobody has to learn it.
 *
 * The track is moved with a percentage translate rather than by scrolling a
 * container, which keeps the whole gesture on the compositor.
 */
function Gallery({ photos, spotId, alt }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const count = photos.length;

  const go = useCallback(
    (next) => {
      setDirection(next > index ? 1 : -1);
      setIndex(Math.max(0, Math.min(count - 1, next)));
    },
    [index, count],
  );

  function onDragEnd(_, info) {
    const throwDistance = info.offset.x;
    const velocity = info.velocity.x;
    if (throwDistance < -60 || velocity < -450) go(index + 1);
    else if (throwDistance > 60 || velocity > 450) go(index - 1);
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      role="group"
      aria-roledescription="carousel"
      aria-label={`${alt} photos`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      }}
      tabIndex={count > 1 ? 0 : -1}
    >
      <motion.div
        className="flex h-full"
        animate={{ x: `${-index * 100}%` }}
        transition={settle}
        drag={count > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={onDragEnd}
      >
        {photos.map((src, i) => (
          <div key={src + i} className="h-full w-full shrink-0">
            <img
              src={src || PLACEHOLDER}
              alt={i === 0 ? alt : `${alt}, photo ${i + 1} of ${count}`}
              draggable={false}
              loading={i === 0 ? 'eager' : 'lazy'}
              onError={(e) => {
                e.currentTarget.src = PLACEHOLDER;
              }}
              className="pointer-events-none h-full w-full object-cover select-none"
            />
          </div>
        ))}
      </motion.div>

      {count > 1 && (
        <>
          {/* Arrows are desktop-only — on a phone the swipe is the control and
              a pair of tap targets over the photo just gets in the way. */}
          <div className="pointer-events-none absolute inset-x-3 top-1/2 hidden -translate-y-1/2 justify-between md:flex">
            <span className={`pointer-events-auto ${index === 0 ? 'invisible' : ''}`}>
              <IconButton
                icon={ChevronLeft}
                label="Previous photo"
                size={40}
                onClick={() => go(index - 1)}
                className="bg-surface/90 backdrop-blur-sm"
              />
            </span>
            <span className={`pointer-events-auto ${index === count - 1 ? 'invisible' : ''}`}>
              <IconButton
                icon={ChevronRight}
                label="Next photo"
                size={40}
                onClick={() => go(index + 1)}
                className="bg-surface/90 backdrop-blur-sm"
              />
            </span>
          </div>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className="cursor-pointer p-1.5"
              >
                <motion.span
                  className="block h-1.5 rounded-full bg-white"
                  animate={{ width: i === index ? 22 : 6, opacity: i === index ? 1 : 0.55 }}
                  transition={snap}
                />
              </button>
            ))}
          </div>
        </>
      )}
      <span className="sr-only" aria-live="polite">
        Photo {index + 1} of {count}
      </span>
    </div>
  );
}

/** Save-to-list picker, in the app's standard drawer. */
function SaveToListDrawer({ open, onClose, spotId }) {
  const [lists, setLists] = useState(null);
  const [status, setStatus] = useState({});

  useEffect(() => {
    if (!open) return;
    listsApi
      .getLists()
      .then(setLists)
      .catch(() => setLists([]));
  }, [open]);

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
    <Drawer open={open} onClose={onClose} title="Save to a list" description="Keep it with the others">
      {lists === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" rounded="rounded-xl" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <EmptyState
          title="No lists yet"
          hint="Lists are how you group spots — “Weeknight dinners”, “Worth the drive”, that sort of thing."
          action={
            <Button to="/lists" icon={Plus}>
              Create a list
            </Button>
          }
        />
      ) : (
        <ul className="space-y-1.5">
          {lists.map((list) => (
            <li key={list.id}>
              <motion.button
                type="button"
                onClick={() => save(list)}
                disabled={status[list.id] === 'saved'}
                className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-left text-sm shadow-[var(--shadow-card)] disabled:opacity-70"
                whileTap={{ scale: 0.98 }}
                transition={snap}
              >
                <span className="truncate font-medium">{list.title}</span>
                {status[list.id] === 'saved' && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={snap}
                    className="flex items-center gap-1 text-xs font-semibold text-success"
                  >
                    <Check size={14} aria-hidden /> Saved
                  </motion.span>
                )}
                {status[list.id] === 'saving' && <span className="text-xs text-muted">Saving…</span>}
              </motion.button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Bleed flush>
        <Skeleton className="h-[46vh] min-h-[300px] w-full md:h-[58vh]" rounded="rounded-none" />
      </Bleed>
      <div className="space-y-4 py-6">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="pt-4">
          <ReviewSkeleton count={2} />
        </div>
      </div>
    </div>
  );
}

export default function SpotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const savedIds = useSavedStore((s) => s.ids);
  const toggleSaved = useSavedStore((s) => s.toggle);
  const initSaved = useSavedStore((s) => s.init);
  const reduced = useMotionSafe();

  const [spot, setSpot] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('reviews');
  const [state, setState] = useState({ loading: true, error: null });
  const [saveOpen, setSaveOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState({ busy: false, error: null });

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  // The hero drifts down as the page scrolls up, so the content slides over a
  // photo that's still moving — the classic depth cue, done on transform only.
  const heroY = useTransform(scrollYProgress, [0, 1], useParallaxRange(['0%', '26%']));
  const heroScale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [1, 1.12]);

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

  useEffect(() => {
    if (user) initSaved();
  }, [user, initSaved]);

  if (state.loading) return <DetailSkeleton />;
  if (state.error) return <ErrorState error={state.error} onRetry={load} />;
  if (!spot) return null;

  const open = isOpenNow(spot.hours);
  const isOwner = user && spot.ownerUserId === user.id;
  const canEdit = canEditSpot(spot, user);
  const alreadyReviewed = reviews.some((r) => r.user?.id === user?.id);
  // _count comes from the detail query; reviewCount is the denormalised column.
  const reviewCount = spot._count?.reviews ?? spot.reviewCount ?? 0;
  const photos = spot.photos?.length ? spot.photos : [PLACEHOLDER];
  const vibes = vibesFor(spot);
  const isSaved = savedIds.has(spot.id);

  async function quickSave() {
    if (!user) return navigate('/login', { state: { from: `/spots/${spot.id}` } });
    try {
      await toggleSaved(spot.id, spot);
    } catch {
      // Fall back to the explicit picker if the quick save couldn't write.
      setSaveOpen(true);
    }
  }

  async function share() {
    // Native share sheet on mobile, clipboard everywhere else.
    if (navigator.share) {
      try {
        await navigator.share({ title: spot.name, url: window.location.href });
        return;
      } catch {
        /* user dismissed the sheet — fall through to copy */
      }
    }
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

  const tabs = [
    { id: 'reviews', label: 'Reviews', count: reviews.length },
    { id: 'dishes', label: 'Dishes', count: spot.dishes?.length ?? 0 },
  ];

  return (
    <div className="pb-24 md:pb-0">
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <Bleed flush>
      <div ref={heroRef} className="relative h-[46vh] min-h-[300px] overflow-hidden md:h-[58vh]">
        <motion.div
          layoutId={`spot-photo-${spot.id}`}
          className="grade-warm absolute inset-0"
          style={{ y: heroY, scale: heroScale }}
        >
          <Gallery photos={photos} spotId={spot.id} alt={spot.name} />
        </motion.div>

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/15 to-charcoal/25"
          aria-hidden
        />

        <div className="absolute top-4 left-4 z-10">
          <IconButton
            icon={ArrowLeft}
            label="Go back"
            onClick={() => navigate(-1)}
            className="bg-surface/90 backdrop-blur-sm"
          />
        </div>

        <div className="absolute top-4 right-4 z-10">
          <SaveButton saved={isSaved} onToggle={quickSave} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            {vibes.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {vibes.slice(0, 3).map((v) => (
                  <Tag key={v.id} tone="olive" className="bg-bg/95 backdrop-blur-sm">
                    {v.label}
                  </Tag>
                ))}
              </div>
            )}
            <motion.h1
              layoutId={`spot-title-${spot.id}`}
              className="font-display text-[length:var(--text-section)] leading-[1.02] font-black text-white"
            >
              {spot.name}
            </motion.h1>
            <p className="label-caps mt-2 text-white/85">
              {spot.cuisineType?.join(' · ')} · {priceLabel(spot.priceRange)}
            </p>
          </div>
        </div>
      </div>
      </Bleed>

      {/* ─── Body ───────────────────────────────────────────────────────── */}
      <div className="pt-6 md:pt-8">
        <div className="flex flex-col gap-8 md:flex-row md:gap-10">
          <div className="min-w-0 flex-[3]">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-5">
              <StarRating value={spot.overallRating} size={20} showValue label="Overall rating" />
              <span className="text-sm text-muted">
                {spot.reviewCount} review{spot.reviewCount === 1 ? '' : 's'}
              </span>

              {open !== null && (
                <span
                  className={`rounded-chip px-2.5 py-1 text-xs font-semibold ${
                    open ? 'bg-success-soft text-success' : 'bg-line/60 text-muted'
                  }`}
                >
                  {open ? 'Open now' : 'Closed'}
                </span>
              )}

              <p className="w-full text-sm text-muted">{spot.address}</p>

              {spot.dietaryTags?.length > 0 && (
                <div className="flex w-full flex-wrap gap-1.5">
                  {spot.dietaryTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-chip bg-success-soft px-2.5 py-1 text-xs font-medium text-success"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <nav className="mt-6 flex gap-1 border-b border-line" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  id={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`relative cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t.id ? 'text-accent-dark' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t.label} <span className="text-xs opacity-70">({t.count})</span>
                  {/* Shared element: the underline slides between tabs. */}
                  {tab === t.id && (
                    <motion.span
                      layoutId="detail-tab"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                      transition={settle}
                      aria-hidden
                    />
                  )}
                </button>
              ))}
            </nav>

            <div
              className="mt-5"
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === 'dishes' ? (
                    spot.dishes?.length ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {spot.dishes.map((dish) => (
                          <DishCard key={dish.id} dish={dish} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="No dishes listed yet"
                        hint="Once someone adds what to order here, it’ll show up in this tab."
                      />
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
                      title="Nobody’s said anything yet"
                      hint="Been here? You’d be the first to tell everyone what’s worth ordering."
                      action={
                        user && !alreadyReviewed ? (
                          <Button to={`/spots/${spot.id}/review/new`} icon={PenLine}>
                            Write the first review
                          </Button>
                        ) : null
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ─── Aside ──────────────────────────────────────────────────── */}
          <aside className="w-full shrink-0 space-y-3 md:w-72">
            {/* Desktop action panel. On mobile these live in the sticky bar. */}
            <div className="hidden space-y-2 rounded-card bg-surface p-4 shadow-[var(--shadow-card)] md:block">
              <Button
                href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
                target="_blank"
                rel="noreferrer"
                icon={Navigation}
                block
              >
                Get directions
              </Button>

              <Button
                variant="secondary"
                icon={Share2}
                onClick={share}
                block
                aria-live="polite"
              >
                {shared ? 'Link copied' : 'Share'}
              </Button>

              <Button
                variant="secondary"
                onClick={() => (user ? setSaveOpen(true) : navigate('/login'))}
                block
              >
                Save to a list…
              </Button>

              {user && !alreadyReviewed && (
                <Button to={`/spots/${spot.id}/review/new`} variant="olive" icon={PenLine} block>
                  Write a review
                </Button>
              )}
            </div>

            {canEdit && (
              <div className="space-y-2 rounded-card bg-surface p-4 shadow-[var(--shadow-card)]">
                <p className="label-caps text-muted">
                  {isOwner ? 'You own this spot' : 'You added this spot'}
                </p>

                <Button to={`/spots/${spot.id}/edit`} variant="secondary" icon={Pencil} block>
                  Edit spot
                </Button>

                <AnimatePresence mode="wait">
                  {confirmDelete ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="py-2 text-xs text-muted">
                        Delete “{spot.name}” for everyone? This can’t be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={remove}
                          disabled={deleting.busy}
                          className="flex-1"
                        >
                          {deleting.busy ? 'Deleting…' : 'Delete'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <Button
                      key="delete"
                      variant="secondary"
                      icon={Trash2}
                      onClick={() => setConfirmDelete(true)}
                      disabled={reviewCount > 0}
                      title={
                        reviewCount > 0 ? 'Spots with reviews cannot be deleted' : 'Delete this spot'
                      }
                      block
                      className="text-danger hover:border-danger hover:text-danger"
                    >
                      Delete spot
                    </Button>
                  )}
                </AnimatePresence>

                {reviewCount > 0 && !confirmDelete && (
                  <p className="text-xs leading-relaxed text-muted">
                    Deleting would take its reviews and dishes with it, so spots with reviews stay
                    put. You can still edit this one.
                  </p>
                )}

                {deleting.error && (
                  <p role="alert" className="text-xs text-danger">
                    {deleting.error}
                  </p>
                )}
              </div>
            )}

            {/* Static map preview keeps this panel useful without loading a
                full interactive map into the detail page. */}
            <motion.a
              href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-card bg-surface shadow-[var(--shadow-card)]"
              whileHover={{ y: -3 }}
              transition={settle}
            >
              <div className="relative flex aspect-video items-center justify-center bg-olive-soft">
                {/* A hand-drawn street grid — a real map tile here would be a
                    network request for something that isn't interactive. */}
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 300 170"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M-10 40h320M-10 110h320M60 -10v190M170 -10v190M240 -10v190"
                    stroke="var(--color-olive)"
                    strokeOpacity=".22"
                    strokeWidth="6"
                  />
                  <path
                    d="M-10 75c60 8 120-14 180-4s80 6 140-6"
                    stroke="var(--color-olive)"
                    strokeOpacity=".3"
                    strokeWidth="3"
                  />
                </svg>
                <motion.span
                  className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-[var(--shadow-ember)]"
                  animate={reduced ? {} : { y: [0, -5, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Navigation size={16} aria-hidden />
                </motion.span>
              </div>
              <p className="px-4 py-3 text-xs text-muted">
                {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)} — open in Maps
              </p>
            </motion.a>

            {spot.hours && (
              <div className="rounded-card bg-surface p-4 shadow-[var(--shadow-card)]">
                <h2 className="flex items-center gap-1.5 font-display text-base font-semibold">
                  <Clock size={15} aria-hidden /> Hours
                </h2>
                <dl className="mt-2.5 space-y-1.5 text-xs">
                  {Object.entries(spot.hours).map(([day, h]) => (
                    <div key={day} className="flex justify-between gap-4">
                      <dt className="text-muted capitalize">{day}</dt>
                      <dd className="font-medium tabular-nums">
                        {h?.open && h?.close ? `${h.open} – ${h.close}` : 'Closed'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/*
        Mobile action bar. The two things a person standing on a street corner
        actually wants — directions and a way to record this place — are pinned
        within thumb reach instead of buried in a sidebar below the reviews.
      */}
      <motion.div
        className="fixed inset-x-0 bottom-(--spacing-bottomnav) z-30 flex gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md pb-safe md:hidden"
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ ...settle, delay: 0.25 }}
      >
        <Button
          href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
          target="_blank"
          rel="noreferrer"
          icon={Navigation}
          className="flex-1"
        >
          Directions
        </Button>
        {user && !alreadyReviewed ? (
          <Button to={`/spots/${spot.id}/review/new`} variant="secondary" icon={PenLine}>
            Review
          </Button>
        ) : (
          <Button variant="secondary" icon={Share2} onClick={share}>
            {shared ? 'Copied' : 'Share'}
          </Button>
        )}
      </motion.div>

      <SaveToListDrawer open={saveOpen} onClose={() => setSaveOpen(false)} spotId={spot.id} />
    </div>
  );
}
