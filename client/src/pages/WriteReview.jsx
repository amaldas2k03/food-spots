import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BadgeCheck, ImagePlus, Video, X, MapPin } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import * as reviewsApi from '../api/reviews.js';
import StarRating from '../components/StarRating.jsx';
import { Spinner, ErrorState } from '../components/Feedback.jsx';
import { useGeolocation } from '../hooks/useGeolocation.js';

const VERIFIED_RADIUS_M = 100;
const MAX_VIDEO_SECONDS = 60;

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

export default function WriteReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { coords, error: geoError, loading: geoLoading, request } = useGeolocation();

  const [spot, setSpot] = useState(null);
  const [state, setState] = useState({ loading: true, error: null });

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [dishRatings, setDishRatings] = useState({});
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

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

  const distance = coords && spot ? distanceMeters(coords, spot) : null;
  const willVerify = distance != null && distance < VERIFIED_RADIUS_M;

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
        setVideoError(`Video is ${Math.round(probe.duration)}s — the limit is ${MAX_VIDEO_SECONDS}s`);
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
        photos,
        video,
        coords,
      });
      navigate(`/spots/${id}`);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  }

  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} />;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/spots/${id}`} className="text-sm text-accent hover:underline">
        ← Back to {spot.name}
      </Link>

      <h1 className="mt-2 font-display text-xl font-bold">Write a review</h1>
      <p className="text-sm text-muted">{spot.name}</p>

      {/* Verified-visit status */}
      <div
        className={`card mt-4 flex items-center gap-3 p-4 ${
          willVerify ? 'border-l-2 border-success' : ''
        }`}
      >
        {willVerify ? (
          <>
            <BadgeCheck size={20} className="shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium text-success">Verified visit</p>
              <p className="text-xs text-muted">
                You're {Math.round(distance)}m from {spot.name} — this review gets a verified badge
                and a bonus point.
              </p>
            </div>
          </>
        ) : (
          <>
            <MapPin size={20} className="shrink-0 text-muted" />
            <div className="flex-1">
              <p className="text-sm font-medium">Not verified</p>
              <p className="text-xs text-muted">
                {geoLoading
                  ? 'Checking your location…'
                  : geoError
                    ? geoError
                    : distance != null
                      ? `You're ${Math.round(distance)}m away — you need to be within ${VERIFIED_RADIUS_M}m.`
                      : 'Share your location to earn a verified badge.'}
              </p>
            </div>
            {!geoLoading && (
              <button
                type="button"
                onClick={request}
                className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent"
              >
                Retry
              </button>
            )}
          </>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-5">
        <div className="card p-4">
          <label className="block text-sm font-medium">
            Overall rating <span className="text-accent">*</span>
          </label>
          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} size={28} />
          </div>
        </div>

        <div className="card p-4">
          <label htmlFor="text" className="block text-sm font-medium">
            Your review <span className="text-accent">*</span>
          </label>
          <textarea
            id="text"
            required
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you order? How was it? Would you go back?"
            className="mt-2 w-full rounded-lg border border-line bg-bg p-3 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        {spot.dishes?.length > 0 && (
          <div className="card p-4">
            <p className="text-sm font-medium">Rate individual dishes</p>
            <p className="text-xs text-muted">Optional — only the ones you tried.</p>

            <ul className="mt-3 space-y-2">
              {spot.dishes.map((dish) => (
                <li key={dish.id} className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm">{dish.name}</span>
                  <div className="flex items-center gap-1.5">
                    <StarRating
                      value={dishRatings[dish.id] ?? 0}
                      onChange={(v) => setDishRatings((d) => ({ ...d, [dish.id]: v }))}
                      size={16}
                    />
                    {dishRatings[dish.id] && (
                      <button
                        type="button"
                        aria-label={`Clear rating for ${dish.name}`}
                        onClick={() =>
                          setDishRatings((d) => {
                            const next = { ...d };
                            delete next[dish.id];
                            return next;
                          })
                        }
                        className="text-muted hover:text-ink"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card p-4">
          <p className="text-sm font-medium">Photos and video</p>

          <div className="mt-3 flex gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs hover:border-accent">
              <ImagePlus size={14} /> Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files)].slice(0, 10))}
                className="hidden"
              />
            </label>

            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs hover:border-accent">
              <Video size={14} /> Add video (max {MAX_VIDEO_SECONDS}s)
              <input
                type="file"
                accept="video/*"
                onChange={(e) => pickVideo(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>

          {videoError && <p className="mt-2 text-xs text-red-600">{videoError}</p>}

          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-ink p-0.5 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {video && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted">
              <Video size={13} /> {video.name}
              <button
                type="button"
                onClick={() => setVideo(null)}
                className="text-accent hover:underline"
              >
                remove
              </button>
            </p>
          )}

          <p className="mt-2 text-xs text-muted">
            Uploads need Cloudinary configured on the server — see <code>server/.env</code>.
          </p>
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={submitting || rating === 0 || !text.trim()}
          className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
        >
          {submitting ? 'Posting…' : 'Post review'}
        </button>
      </form>
    </div>
  );
}
