import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as spotsApi from '../api/spots.js';
import * as socialApi from '../api/social.js';
import SpotCard from '../components/SpotCard.jsx';
import Avatar from '../components/Avatar.jsx';
import { Spinner, ErrorState, EmptyState, SectionHeading } from '../components/Feedback.jsx';
import { useAuthStore } from '../store/authStore.js';
import { timeAgo } from '../utils/format.js';

function SpotRow({ spots }) {
  return (
    <div className="scroll-row flex gap-4 overflow-x-auto pb-2">
      {spots.map((spot) => (
        <SpotCard key={spot.id} spot={spot} className="w-56 shrink-0" />
      ))}
    </div>
  );
}

function activityLine(a) {
  const p = a.payload ?? {};
  switch (a.type) {
    case 'review_created':
      return (
        <>
          reviewed <Link to={`/spots/${p.spotId}`} className="font-medium text-accent hover:underline">{p.spotName ?? 'a spot'}</Link>
        </>
      );
    case 'spot_saved':
      return (
        <>
          saved <Link to={`/spots/${p.spotId}`} className="font-medium text-accent hover:underline">{p.spotName ?? 'a spot'}</Link>
          {p.listTitle ? ` to ${p.listTitle}` : ''}
        </>
      );
    case 'list_created':
      return (
        <>
          created a list:{' '}
          <Link to={`/lists/${p.listId}`} className="font-medium text-accent hover:underline">{p.title}</Link>
        </>
      );
    case 'crawl_created':
      return <>started a food crawl: <span className="font-medium">{p.title}</span></>;
    default:
      return 'did something';
  }
}

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState({ trending: [], gems: [], feed: [] });
  const [state, setState] = useState({ loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ loading: true, error: null });
      try {
        const [trending, gems] = await Promise.all([
          spotsApi.getTrending(),
          spotsApi.getHiddenGems(),
        ]);
        // The feed needs auth; signed-out visitors just don't get that section.
        const feed = user ? await socialApi.getFeed().then((r) => r.activities).catch(() => []) : [];
        if (!cancelled) {
          setData({ trending, gems, feed });
          setState({ loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading
          title="Trending Spots"
          subtitle="Most reviewed in the last 7 days"
          action={
            <Link to="/search?sort=reviews" className="text-sm text-accent hover:underline">
              See all
            </Link>
          }
        />
        {data.trending.length ? (
          <SpotRow spots={data.trending} />
        ) : (
          <EmptyState title="No trending spots yet" hint="Reviews from the past week show up here." />
        )}
      </section>

      <section>
        <SectionHeading title="Hidden Gems" subtitle="Rated 4.5+ with fewer than 20 reviews" />
        {data.gems.length ? (
          <SpotRow spots={data.gems} />
        ) : (
          <EmptyState title="No hidden gems yet" hint="Highly rated spots with few reviews appear here." />
        )}
      </section>

      <section>
        <SectionHeading
          title="Friends Activity"
          subtitle={user ? 'What the people you follow are up to' : undefined}
        />

        {!user ? (
          <EmptyState
            title="Sign in to see your friends' activity"
            action={
              <Link
                to="/login"
                className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
              >
                Sign in
              </Link>
            }
          />
        ) : data.feed.length === 0 ? (
          <EmptyState
            title="Your feed is quiet"
            hint="Follow a few people and their reviews, lists, and crawls will show up here."
            action={
              <Link
                to="/social"
                className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
              >
                Find people to follow
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {data.feed.map((a) => (
              <li key={a.id} className="card flex items-center gap-3 p-3">
                <Avatar user={a.user} size={36} />
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
      </section>
    </div>
  );
}
