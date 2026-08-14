import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, ImagePlus, Video, X, MapPin, ArrowLeft, Check } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import * as reviewsApi from '../api/reviews.js';
import StarRating from '../components/StarRating.jsx';
import { ErrorState } from '../components/Feedback.jsx';
import { Button, IconButton, Skeleton } from '../components/ui/index.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { settle, snap, bounce, useMotionSafe } from '../motion/index.js';

const VERIFIED_RADIUS_M = 100;
const MAX_VIDEO_SECONDS = 60;
const MAX_PHOTOS = 10;

/** Plain-language read-back of the star value, so the rating isn't just a number. */
const RATING_WORDS = {
  1: 'Wouldn’t go back',
  2: 'It was fine',
  3: 'Solid',
  4: 'Really good',
  5: 'Unmissable',
};

// Mirrors the server's haversine check so the badge can be previewed before submit.
function distanceMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * The moment after a review posts.
 *
 * A review is the most effort anyone puts into this app, so it gets the
 * biggest reaction: a stamp that lands with an overshoot, a ring that pushes
 * out from under it, and the spot's name confirmed back to you. It holds for
 * ~1.1s and then the page moves on by itself — long enough to register,
 * short enough that nobody has to dismiss it.
 */
function PostedOverlay({ spotName }) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-bg/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-live="assertive"
    >
      <motion.div
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-success text-white"
        initial={{ scale: 0, rotate: -25 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={bounce}
      >
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-success"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          aria-hidden
        />
        <Check size={44} strokeWidth={3} aria-hidden />
      </motion.div>

      <motion.p
        className="px-6 text-center font-display text-2xl font-bold"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...settle, delay: 0.18 }}
      >
        Posted. Thanks for that.
      </motion.p>
      <motion.p
        className="px-6 text-center text-sm text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Your review of {spotName} is live.
      </motion.p>
    </motion.div>
  );
}

export default function WriteReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { coords, error: geoError, loading: geoLoading, request } = useGeolocation();
  const reduced = useMotionSafe();

  const [spot, setSpot] = useState(null);
  const [state, setState] = useState({ loading: true, error: null });

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [dishRatings, setDishRatings] = useState({});
  /* Photos are held as { file, url } so each preview URL is created once and
     revoked when it goes away. Calling createObjectURL in render leaks a blob
     URL on every keystroke that re-renders this form. */
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const photosRef = useRef(photos);

  useEffect(() => {
    spotsApi
      .getSpot(id)
      .then((s) => {
        setSpot(s);
        setState({ loading: false, error: null });
      })
      .catch((err) => setState({ loading: false, error: err }));
  }, [id]);

  // Ask for location on mount — the verified badge is the point of the page.
  useEffect(() => {
    request();
  }, [request]);

  // Keep a ref of the current previews so unmount can revoke them all without
  // re-running this effect (and revoking live URLs) on every photo change.
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const distance = coords && spot ? distanceMeters(coords, spot) : null;
  const willVerify = distance != null && distance < VERIFIED_RADIUS_M;

  function addPhotos(fileList) {
    const incoming = Array.from(fileList).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotos((current) => {
      const next = [...current, ...incoming];
      // Revoke anything that overflowed the cap rather than leaking it.
      next.slice(MAX_PHOTOS).forEach((p) => URL.revokeObjectURL(p.url));
      return next.slice(0, MAX_PHOTOS);
    });
  }

  function removePhoto(index) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, i) => i !== index);
    });
  }

  /** Reads duration client-side so an over-long video is caught before upload. */
  function pickVideo(file) {
    setVideoError(null);
    if (!file) return setVideo(null);

    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (probe.duration > MAX_VIDEO_SECONDS) {
        setVideoError(
          `Video is ${Math.round(probe.duration)}s — the limit is ${MAX_VIDEO_SECONDS}s`,
        );
        setVideo(null);
      } else {
        setVideo(file);
      }
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setVideoError('Could not read that video file');
    };
    probe.src = url;
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await reviewsApi.createReview(id, {
        overallRating: rating,
        text,
        dishRatings: Object.entries(dishRatings).map(([dishId, r]) => ({ dishId, rating: r })),
        photos: photos.map((p) => p.file),
        video,
        coords,
      });
      setPosted(true);
      // Let the confirmation land before moving on. Reduced motion skips it.
      setTimeout(() => navigate(`/spots/${id}`), reduced ? 0 : 1100);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  }

  if (state.loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-20 w-full" rounded="rounded-card" />
        <Skeleton className="h-32 w-full" rounded="rounded-card" />
        <Skeleton className="h-48 w-full" rounded="rounded-card" />
      </div>
    );
  }
  if (state.error) return <ErrorState error={state.error} />;

  const card = 'rounded-card bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5';

  return (
    <div className="mx-auto max-w-2xl">
      <AnimatePresence>{posted && <PostedOverlay spotName={spot.name} />}</AnimatePresence>

      <Link
        to={`/spots/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
      >
        <ArrowLeft size={15} aria-hidden /> Back to {spot.name}
      </Link>

      <h1 className="mt-3 font-display text-[length:var(--text-section)] font-black">
        How was it?
      </h1>
      <p className="mt-1 text-sm text-muted">{spot.name}</p>

      {/* Verified-visit status */}
      <motion.div
        className={`${card} mt-5 flex items-center gap-3 ${
          willVerify ? 'border-l-[3px] border-success' : ''
        }`}
        animate={willVerify ? { scale: [1, 1.02, 1] } : {}}
        transition={settle}
      >
        {willVerify ? (
          <>
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={bounce}
              className="shrink-0 text-success"
            >
              <BadgeCheck size={22} aria-hidden />
            </motion.span>
            <div>
              <p className="text-sm font-semibold text-success">Verified visit</p>
              <p className="text-xs text-muted">
                You’re {Math.round(distance)}m from {spot.name} — this review gets a verified badge
                and a bonus point.
              </p>
            </div>
          </>
        ) : (
          <>
            <MapPin size={20} className="shrink-0 text-muted" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-semibold">Not verified</p>
              <p className="text-xs text-muted">
                {geoLoading
                  ? 'Checking your location…'
                  : geoError
                    ? geoError
                    : distance != null
                      ? `You’re ${Math.round(distance)}m away — you need to be within ${VERIFIED_RADIUS_M}m.`
                      : 'Share your location to earn a verified badge.'}
              </p>
            </div>
            {!geoLoading && (
              <Button variant="secondary" size="sm" onClick={request}>
                Retry
              </Button>
            )}
          </>
        )}
      </motion.div>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className={card}>
          <p className="text-sm font-semibold">
            Overall rating <span className="text-accent">*</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <StarRating value={rating} onChange={setRating} size={32} label="Overall rating" />

            {/* The word swaps with a spring as the stars change — the rating
                reads back in language, not just as a count of icons. */}
            <AnimatePresence mode="wait">
              {rating > 0 && (
                <motion.span
                  key={rating}
                  className="font-display text-lg font-semibold text-accent-dark"
                  initial={{ opacity: 0, y: 10, rotate: -3 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={snap}
                >
                  {RATING_WORDS[rating]}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className={card}>
          <label htmlFor="text" className="block text-sm font-semibold">
            Your review <span className="text-accent">*</span>
          </label>
          <textarea
            id="text"
            required
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you order? How was it? Would you go back?"
            className="mt-2.5 w-full rounded-xl border border-line bg-bg p-3.5 font-display text-base leading-relaxed focus:border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-right text-xs text-muted">
            {text.trim().length} character{text.trim().length === 1 ? '' : 's'}
          </p>
        </div>

        {spot.dishes?.length > 0 && (
          <div className={card}>
            <p className="text-sm font-semibold">Rate individual dishes</p>
            <p className="text-xs text-muted">Optional — only the ones you tried.</p>

            <ul className="mt-3 divide-y divide-line">
              {spot.dishes.map((dish) => (
                <li key={dish.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm">{dish.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <StarRating
                      value={dishRatings[dish.id] ?? 0}
                      onChange={(v) => setDishRatings((d) => ({ ...d, [dish.id]: v }))}
                      size={18}
                      label={`${dish.name} rating`}
                    />
                    {dishRatings[dish.id] && (
                      <IconButton
                        icon={X}
                        label={`Clear rating for ${dish.name}`}
                        size={32}
                        variant="quiet"
                        onClick={() =>
                          setDishRatings((d) => {
                            const next = { ...d };
                            delete next[dish.id];
                            return next;
                          })
                        }
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={card}>
          <p className="text-sm font-semibold">Photos and video</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-medium transition-colors hover:border-accent hover:text-accent">
              <ImagePlus size={15} aria-hidden /> Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </label>

            <label className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-medium transition-colors hover:border-accent hover:text-accent">
              <Video size={15} aria-hidden /> Add video (max {MAX_VIDEO_SECONDS}s)
              <input
                type="file"
                accept="video/*"
                onChange={(e) => pickVideo(e.target.files[0])}
                className="sr-only"
              />
            </label>
          </div>

          {videoError && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {videoError}
            </p>
          )}

          {photos.length > 0 && (
            <motion.div layout className="mt-3 flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout">
                {photos.map((p, i) => (
                  <motion.div
                    key={p.url}
                    layout
                    className="relative"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={snap}
                  >
                    <img src={p.url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                    <motion.button
                      type="button"
                      aria-label={`Remove photo ${i + 1}`}
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink text-white"
                      whileTap={{ scale: 0.85 }}
                      transition={snap}
                    >
                      <X size={13} aria-hidden />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {video && (
            <p className="mt-2.5 flex items-center gap-2 text-xs text-muted">
              <Video size={13} aria-hidden /> {video.name}
              <button
                type="button"
                onClick={() => setVideo(null)}
                className="cursor-pointer text-accent hover:underline"
              >
                remove
              </button>
            </p>
          )}

          <p className="mt-2.5 text-xs text-muted">
            Uploads need Cloudinary configured on the server — see <code>server/.env</code>.
          </p>
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-danger">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          block
          disabled={submitting || rating === 0 || !text.trim()}
        >
          {submitting ? 'Posting…' : 'Post review'}
        </Button>
        {(rating === 0 || !text.trim()) && (
          <p className="text-center text-xs text-muted">
            {rating === 0 ? 'Pick a rating' : 'Write a line or two'} to post.
          </p>
        )}
      </form>
    </div>
  );
}
