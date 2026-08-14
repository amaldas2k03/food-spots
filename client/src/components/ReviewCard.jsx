import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, BadgeCheck, MessageSquare } from 'lucide-react';
import StarRating from './StarRating.jsx';
import Avatar from './Avatar.jsx';
import { Button } from './ui/index.js';
import { timeAgo } from '../utils/format.js';
import * as reviewsApi from '../api/reviews.js';
import { useAuthStore } from '../store/authStore.js';
import { snap, settle } from '../motion/index.js';

/**
 * Vote tally that rolls when it changes.
 *
 * The direction of travel is carried by `dir`, so an incrementing count slides
 * up and out and a decrementing one slides down — the number moves the way the
 * value moved. It's a two-pixel detail that makes optimistic voting feel
 * responsive instead of glitchy.
 */
function Count({ value, dir = 1 }) {
  return (
    <span className="relative inline-block h-4 min-w-3 overflow-hidden text-left tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="block"
          initial={{ y: dir > 0 ? 14 : -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: dir > 0 ? -14 : 14, opacity: 0 }}
          transition={snap}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function VoteButton({ active, onClick, disabled, title, icon: Icon, count, dir }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-chip px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-accent-soft font-semibold text-accent-dark' : 'text-muted hover:bg-accent-soft/60'
      }`}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={snap}
    >
      <motion.span animate={active ? { scale: [1, 1.3, 1], rotate: [0, -10, 0] } : {}} transition={snap}>
        <Icon size={14} aria-hidden />
      </motion.span>
      <Count value={count} dir={dir} />
    </motion.button>
  );
}

export default function ReviewCard({ review, canRespond = false, onResponded }) {
  const user = useAuthStore((s) => s.user);
  const [votes, setVotes] = useState({
    helpful: review.helpfulCount,
    notHelpful: review.notHelpfulCount,
    mine: review.myVote ?? null,
  });
  const [dir, setDir] = useState(1);
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState(null);

  const isOwnReview = user?.id === review.user?.id;

  async function vote(helpful) {
    if (!user || isOwnReview) return;
    const previous = votes;
    setDir(votes.mine === helpful ? -1 : 1);
    // Optimistic: reflect the click immediately, roll back if the call fails.
    setVotes((v) => ({
      helpful: v.helpful + (helpful ? 1 : 0) - (v.mine === true ? 1 : 0),
      notHelpful: v.notHelpful + (helpful ? 0 : 1) - (v.mine === false ? 1 : 0),
      mine: helpful,
    }));

    try {
      const res = helpful
        ? await reviewsApi.voteHelpful(review.id)
        : await reviewsApi.voteNotHelpful(review.id);
      if (res.helpfulCount != null) {
        setVotes({ helpful: res.helpfulCount, notHelpful: res.notHelpfulCount, mine: helpful });
      }
    } catch (err) {
      setVotes(previous);
      setError(err.message);
    }
  }

  async function submitResponse(e) {
    e.preventDefault();
    try {
      const saved = await reviewsApi.respondToReview(review.id, responseText);
      setResponding(false);
      setResponseText('');
      onResponded?.(review.id, saved);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <motion.article
      className="rounded-card bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={settle}
    >
      <header className="flex items-start gap-3">
        <Avatar user={review.user} size={42} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/profile/${review.user?.id}`}
              className="font-semibold hover:text-accent hover:underline"
            >
              {review.user?.name}
            </Link>

            {review.verifiedVisit && (
              <span
                className="inline-flex items-center gap-1 rounded-chip bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
                title="GPS confirmed this reviewer was at the spot"
              >
                <BadgeCheck size={12} aria-hidden /> Verified visit
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <StarRating value={review.overallRating} size={14} label="Their rating" />
            <span className="text-xs text-muted">{timeAgo(review.createdAt)}</span>
          </div>
        </div>
      </header>

      {/* Review text gets serif treatment and a rule, so a page of reviews
          reads like letters to an editor rather than support tickets. */}
      <blockquote className="mt-4 border-l-2 border-accent-soft pl-4">
        <p className="font-display text-base leading-relaxed whitespace-pre-line">{review.text}</p>
      </blockquote>

      {review.dishRatings?.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {review.dishRatings.map((dr) => (
            <li
              key={dr.id ?? dr.dishId}
              className="flex items-center gap-1.5 rounded-chip bg-bg px-3 py-1.5 text-xs"
            >
              <span className="font-medium">{dr.dish?.name}</span>
              <StarRating value={dr.rating} size={11} label={`${dr.dish?.name} rating`} />
            </li>
          ))}
        </ul>
      )}

      {review.photos?.length > 0 && (
        <div className="scroll-row mt-4 flex gap-2 overflow-x-auto">
          {review.photos.map((src) => (
            <motion.img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className="h-28 w-28 shrink-0 cursor-zoom-in rounded-xl object-cover"
              whileHover={{ scale: 1.04 }}
              transition={snap}
            />
          ))}
        </div>
      )}

      {review.videoUrl && (
        <video src={review.videoUrl} controls className="mt-4 max-h-64 rounded-xl" />
      )}

      <footer className="mt-4 flex items-center gap-1.5 border-t border-line pt-3">
        <VoteButton
          active={votes.mine === true}
          onClick={() => vote(true)}
          disabled={!user || isOwnReview}
          title={isOwnReview ? 'You cannot vote on your own review' : 'Helpful'}
          icon={ThumbsUp}
          count={votes.helpful}
          dir={dir}
        />
        <VoteButton
          active={votes.mine === false}
          onClick={() => vote(false)}
          disabled={!user || isOwnReview}
          title={isOwnReview ? 'You cannot vote on your own review' : 'Not helpful'}
          icon={ThumbsDown}
          count={votes.notHelpful}
          dir={dir}
        />

        {canRespond && !review.ownerResponse && (
          <Button
            variant="quiet"
            size="sm"
            icon={MessageSquare}
            onClick={() => setResponding((v) => !v)}
            className="ml-auto"
          >
            Respond
          </Button>
        )}
      </footer>

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      <AnimatePresence>
        {responding && (
          <motion.form
            onSubmit={submitResponse}
            className="mt-3 overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={settle}
          >
            <label htmlFor={`response-${review.id}`} className="mb-1.5 block text-xs font-medium">
              Your reply as the owner
            </label>
            <textarea
              id={`response-${review.id}`}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              required
              rows={3}
              placeholder="Thanks for coming in…"
              className="w-full rounded-xl border border-line bg-bg p-3 text-sm focus:border-accent focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              <Button type="submit" size="sm">
                Post response
              </Button>
              <Button type="button" variant="quiet" size="sm" onClick={() => setResponding(false)}>
                Cancel
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {review.ownerResponse && (
        <motion.div
          className="mt-4 rounded-xl border-l-[3px] border-accent bg-accent-soft/60 p-3.5"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={settle}
        >
          <p className="label-caps text-accent-dark">Response from the owner</p>
          <p className="mt-1.5 text-sm leading-relaxed">{review.ownerResponse.text}</p>
          <p className="mt-1.5 text-xs text-muted">{timeAgo(review.ownerResponse.createdAt)}</p>
        </motion.div>
      )}
    </motion.article>
  );
}
