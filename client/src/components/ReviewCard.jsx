import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, BadgeCheck, MessageSquare } from 'lucide-react';
import StarRating from './StarRating.jsx';
import Avatar from './Avatar.jsx';
import { timeAgo } from '../utils/format.js';
import * as reviewsApi from '../api/reviews.js';
import { useAuthStore } from '../store/authStore.js';

export default function ReviewCard({ review, canRespond = false, onResponded }) {
  const user = useAuthStore((s) => s.user);
  const [votes, setVotes] = useState({
    helpful: review.helpfulCount,
    notHelpful: review.notHelpfulCount,
    mine: review.myVote ?? null,
  });
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState(null);

  const isOwnReview = user?.id === review.user?.id;

  async function vote(helpful) {
    if (!user || isOwnReview) return;
    const previous = votes;
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
    <article className="card p-4">
      <header className="flex items-start gap-3">
        <Avatar user={review.user} size={40} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/profile/${review.user?.id}`} className="font-medium hover:text-accent">
              {review.user?.name}
            </Link>

            {review.verifiedVisit && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
                title="GPS confirmed this reviewer was at the spot"
              >
                <BadgeCheck size={12} /> Verified visit
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <StarRating value={review.overallRating} size={14} />
            <span className="text-xs text-muted">{timeAgo(review.createdAt)}</span>
          </div>
        </div>
      </header>

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{review.text}</p>

      {review.dishRatings?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {review.dishRatings.map((dr) => (
            <li
              key={dr.id ?? dr.dishId}
              className="flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 text-xs"
            >
              <span>{dr.dish?.name}</span>
              <StarRating value={dr.rating} size={11} />
            </li>
          ))}
        </ul>
      )}

      {review.photos?.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scroll-row">
          {review.photos.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {review.videoUrl && (
        <video src={review.videoUrl} controls className="mt-3 max-h-64 rounded-lg" />
      )}

      <footer className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => vote(true)}
          disabled={!user || isOwnReview}
          title={isOwnReview ? 'You cannot vote on your own review' : 'Helpful'}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40 ${
            votes.mine === true ? 'bg-accent-soft text-accent' : 'hover:bg-bg'
          }`}
        >
          <ThumbsUp size={14} /> {votes.helpful}
        </button>

        <button
          type="button"
          onClick={() => vote(false)}
          disabled={!user || isOwnReview}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40 ${
            votes.mine === false ? 'bg-accent-soft text-accent' : 'hover:bg-bg'
          }`}
        >
          <ThumbsDown size={14} /> {votes.notHelpful}
        </button>

        {canRespond && !review.ownerResponse && (
          <button
            type="button"
            onClick={() => setResponding((v) => !v)}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-accent hover:bg-accent-soft"
          >
            <MessageSquare size={14} /> Respond
          </button>
        )}
      </footer>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {responding && (
        <form onSubmit={submitResponse} className="mt-3">
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            required
            rows={3}
            placeholder="Reply as the owner of this spot…"
            className="w-full rounded-lg border border-line bg-bg p-2.5 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-dark"
            >
              Post response
            </button>
            <button
              type="button"
              onClick={() => setResponding(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-bg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {review.ownerResponse && (
        <div className="mt-3 rounded-lg border-l-2 border-accent bg-accent-soft/50 p-3">
          <p className="text-xs font-semibold text-accent">Response from the owner</p>
          <p className="mt-1 text-sm">{review.ownerResponse.text}</p>
          <p className="mt-1 text-xs text-muted">{timeAgo(review.ownerResponse.createdAt)}</p>
        </div>
      )}
    </article>
  );
}
