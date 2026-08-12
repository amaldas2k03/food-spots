import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Check } from 'lucide-react';
import * as socialApi from '../api/social.js';
import Avatar from '../components/Avatar.jsx';
import { Spinner, ErrorState, EmptyState, SectionHeading } from '../components/Feedback.jsx';
import { timeAgo } from '../utils/format.js';

function activityLine(a) {
  const p = a.payload ?? {};
  switch (a.type) {
    case 'review_created':
      return (
        <>
          left a review on{' '}
          <Link to={`/spots/${p.spotId}`} className="font-medium text-accent hover:underline">
            {p.spotName ?? 'a spot'}
          </Link>
        </>
      );
    case 'spot_saved':
      return (
        <>
          saved{' '}
          <Link to={`/spots/${p.spotId}`} className="font-medium text-accent hover:underline">
            {p.spotName ?? 'a spot'}
          </Link>
          {p.listTitle ? ` to ${p.listTitle}` : ' to a list'}
        </>
      );
    case 'list_created':
      return (
        <>
          created a new list:{' '}
          <Link to={`/lists/${p.listId}`} className="font-medium text-accent hover:underline">
            {p.title}
          </Link>
        </>
      );
    case 'crawl_created':
      return <>started a food crawl: <span className="font-medium">{p.title}</span></>;
    default:
      return 'posted an update';
  }
}

export default function Social() {
  const [feed, setFeed] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [following, setFollowing] = useState({});
  const [state, setState] = useState({ loading: true, error: null });

  useEffect(() => {
    Promise.all([socialApi.getFeed(), socialApi.getSuggestedUsers()])
      .then(([feedRes, users]) => {
        setFeed(feedRes.activities);
        setSuggested(users);
        setState({ loading: false, error: null });
      })
      .catch((err) => setState({ loading: false, error: err }));
  }, []);

  async function follow(userId) {
    setFollowing((f) => ({ ...f, [userId]: 'pending' }));
    try {
      await socialApi.followUser(userId);
      setFollowing((f) => ({ ...f, [userId]: 'done' }));
      // Refresh the feed so the newly followed user's activity appears.
      socialApi.getFeed().then((r) => setFeed(r.activities)).catch(() => {});
    } catch {
      setFollowing((f) => ({ ...f, [userId]: undefined }));
    }
  }

  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} onRetry={() => window.location.reload()} />;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-[2]">
        <SectionHeading title="Activity" subtitle="From the people you follow" />

        {feed.length === 0 ? (
          <EmptyState
            title="Nothing in your feed yet"
            hint="Follow a few people from the panel on the right to fill this up."
          />
        ) : (
          <ul className="space-y-2">
            {feed.map((a) => (
              <li key={a.id} className="card flex items-center gap-3 p-3">
                <Avatar user={a.user} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <Link to={`/profile/${a.user?.id}`} className="font-medium hover:text-accent">
                      {a.user?.name}
                    </Link>{' '}
                    {activityLine(a)}
                  </p>
                  <p className="text-xs text-muted">{timeAgo(a.createdAt)}</p>
                </div>
                {a.spot?.photos?.[0] && (
                  <img src={a.spot.photos[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="w-72 shrink-0">
        <h2 className="mb-3 font-semibold">Suggested for you</h2>

        {suggested.length === 0 ? (
          <p className="card p-4 text-center text-xs text-muted">
            You're following everyone already.
          </p>
        ) : (
          <ul className="space-y-2">
            {suggested.map((u) => (
              <li key={u.id} className="card flex items-center gap-3 p-3">
                <Avatar user={u} size={36} />
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${u.id}`} className="block truncate text-sm font-medium hover:text-accent">
                    {u.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {u.points} pts · {u._count?.reviews ?? 0} reviews
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => follow(u.id)}
                  disabled={Boolean(following[u.id])}
                  className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    following[u.id] === 'done'
                      ? 'bg-success-soft text-success'
                      : 'bg-accent text-white hover:bg-accent-dark'
                  }`}
                >
                  {following[u.id] === 'done' ? (
                    <>
                      <Check size={12} /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} /> Follow
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
