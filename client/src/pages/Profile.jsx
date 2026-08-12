import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserPlus, UserMinus, Award, Route as RouteIcon } from 'lucide-react';
import * as socialApi from '../api/social.js';
import Avatar from '../components/Avatar.jsx';
import ListCard from '../components/ListCard.jsx';
import StarRating from '../components/StarRating.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { useAuthStore } from '../store/authStore.js';
import { timeAgo, formatDistance, formatDuration } from '../utils/format.js';

const TABS = ['reviews', 'lists', 'badges', 'crawls'];

export default function Profile() {
  const { id } = useParams();
  const me = useAuthStore((s) => s.user);

  const [data, setData] = useState(null);
  const [tab, setTab] = useState('reviews');
  const [state, setState] = useState({ loading: true, error: null });
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    setState({ loading: true, error: null });
    socialApi
      .getProfile(id)
      .then((d) => {
        setData(d);
        setState({ loading: false, error: null });
      })
      .catch((err) => setState({ loading: false, error: err }));
  }, [id]);

  async function toggleFollow() {
    setFollowBusy(true);
    const next = !data.isFollowing;
    try {
      await (next ? socialApi.followUser(id) : socialApi.unfollowUser(id));
      setData((d) => ({
        ...d,
        isFollowing: next,
        user: { ...d.user, _count: { ...d.user._count, followers: d.user._count.followers + (next ? 1 : -1) } },
      }));
    } finally {
      setFollowBusy(false);
    }
  }

  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} />;
  if (!data) return null;

  const { user, reviews, lists, crawls } = data;
  const isMe = me?.id === user.id;

  return (
    <div>
      <header className="card flex items-start gap-5 p-6">
        <Avatar user={user} size={80} />

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">{user.name}</h1>

          <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted">
            <span>
              <strong className="text-ink">{user.points}</strong> points
            </span>
            <span>
              <strong className="text-ink">{user._count.reviews}</strong> reviews
            </span>
            <span>
              <strong className="text-ink">{user._count.followers}</strong> followers
            </span>
            <span>
              <strong className="text-ink">{user._count.following}</strong> following
            </span>
          </div>

          {user.tasteProfile?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.tasteProfile.map((t) => (
                <span key={t} className="rounded-full bg-bg px-2.5 py-1 text-xs text-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {me && !isMe && (
          <button
            type="button"
            onClick={toggleFollow}
            disabled={followBusy}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              data.isFollowing
                ? 'border border-line hover:border-accent'
                : 'bg-accent text-white hover:bg-accent-dark'
            }`}
          >
            {data.isFollowing ? (
              <>
                <UserMinus size={15} /> Following
              </>
            ) : (
              <>
                <UserPlus size={15} /> Follow
              </>
            )}
          </button>
        )}
      </header>

      <nav className="mt-6 flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
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
            {t}
            {t === 'reviews' && ` (${reviews.length})`}
            {t === 'lists' && ` (${lists.length})`}
            {t === 'badges' && ` (${user.badges.length})`}
            {t === 'crawls' && ` (${crawls.length})`}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {tab === 'reviews' &&
          (reviews.length === 0 ? (
            <EmptyState title="No reviews yet" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {reviews.map((r) => (
                <article key={r.id} className="card p-4">
                  <Link to={`/spots/${r.spot.id}`} className="flex items-center gap-3 hover:text-accent">
                    {r.spot.photos?.[0] && (
                      <img src={r.spot.photos[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.spot.name}</p>
                      <p className="truncate text-xs text-muted">{r.spot.cuisineType?.join(' · ')}</p>
                    </div>
                  </Link>

                  <div className="mt-2 flex items-center gap-2">
                    <StarRating value={r.overallRating} size={13} />
                    <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
                    {r.verifiedVisit && (
                      <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-xs text-success">
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="mt-2 line-clamp-3 text-sm">{r.text}</p>
                </article>
              ))}
            </div>
          ))}

        {tab === 'lists' &&
          (lists.length === 0 ? (
            <EmptyState title="No lists yet" />
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {lists.map((l) => (
                <ListCard key={l.id} list={l} />
              ))}
            </div>
          ))}

        {tab === 'badges' &&
          (user.badges.length === 0 ? (
            <EmptyState title="No badges yet" hint="Badges are earned by reviewing, curating, and exploring." />
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {user.badges.map((b) => (
                <div key={b} className="card flex flex-col items-center gap-2 p-5 text-center">
                  <Award size={24} className="text-accent" />
                  <span className="text-sm font-medium">{b}</span>
                </div>
              ))}
            </div>
          ))}

        {tab === 'crawls' &&
          (crawls.length === 0 ? (
            <EmptyState title="No food crawls yet" />
          ) : (
            <div className="space-y-3">
              {crawls.map((c) => (
                <div key={c.id} className="card p-4">
                  <div className="flex items-center gap-2">
                    <RouteIcon size={16} className="text-accent" />
                    <h3 className="font-medium">{c.title}</h3>
                  </div>

                  <p className="mt-1 text-xs text-muted">
                    {c.stops.length} stops
                    {c.totalDistance ? ` · ${formatDistance(c.totalDistance)}` : ''}
                    {c.totalEta ? ` · ${formatDuration(c.totalEta)}` : ''}
                  </p>

                  <ol className="mt-2 flex flex-wrap gap-1.5">
                    {c.stops.map((s, i) => (
                      <li key={s.id} className="rounded-full bg-bg px-2.5 py-1 text-xs">
                        {i + 1}. {s.name}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
