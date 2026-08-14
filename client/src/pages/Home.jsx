import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Sparkles, Users } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import * as socialApi from '../api/social.js';
import SpotCard from '../components/SpotCard.jsx';
import Avatar from '../components/Avatar.jsx';
import { ErrorState, EmptyState, SectionHeading } from '../components/Feedback.jsx';
import {
  Button,
  Reveal,
  RevealItem,
  FadeUp,
  SpotRowSkeleton,
  SpotGridSkeleton,
} from '../components/ui/index.js';
import { useAuthStore } from '../store/authStore.js';
import { useSavedStore } from '../store/savedStore.js';
import { timeAgo } from '../utils/format.js';
import { settle, riseIn, slideIn } from '../motion/index.js';

/**
 * Horizontal rail on phones, grid on desktop.
 *
 * Not the same layout scaled — a phone gets a snapping, thumb-swipeable rail
 * that shows a sliver of the next card as an affordance; a desktop gets a
 * three-up grid because there's room to compare at a glance.
 */
function SpotRail({ spots }) {
  return (
    <>
      <Reveal
        className="scroll-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:hidden"
        gap={0.07}
      >
        {spots.map((spot) => (
          <RevealItem key={spot.id} variants={slideIn} className="w-[74vw] shrink-0">
            <SpotCard spot={spot} />
          </RevealItem>
        ))}
      </Reveal>

      <Reveal className="hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3" gap={0.07}>
        {spots.slice(0, 6).map((spot) => (
          <RevealItem key={spot.id} variants={riseIn}>
            <SpotCard spot={spot} />
          </RevealItem>
        ))}
      </Reveal>
    </>
  );
}

function activityLine(a) {
  const p = a.payload ?? {};
  const spotLink = (
    <Link to={`/spots/${p.spotId}`} className="font-semibold text-accent hover:underline">
      {p.spotName ?? 'a spot'}
    </Link>
  );

  switch (a.type) {
    case 'review_created':
      return <>reviewed {spotLink}</>;
    case 'spot_saved':
      return (
        <>
          saved {spotLink}
          {p.listTitle ? ` to ${p.listTitle}` : ''}
        </>
      );
    case 'list_created':
      return (
        <>
          started a list:{' '}
          <Link to={`/lists/${p.listId}`} className="font-semibold text-accent hover:underline">
            {p.title}
          </Link>
        </>
      );
    case 'crawl_created':
      return (
        <>
          planned a food crawl: <span className="font-semibold">{p.title}</span>
        </>
      );
    default:
      return 'did something';
  }
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Breakfast plans?';
  if (h < 15) return 'Lunch is calling';
  if (h < 18) return 'Something to snack on?';
  if (h < 22) return 'Dinner, then';
  return 'Still hungry?';
}

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const initSaved = useSavedStore((s) => s.init);
  const [data, setData] = useState({ trending: [], gems: [], feed: [] });
  const [state, setState] = useState({ loading: true, error: null });

  // Favourites are needed here so the hearts on cards render in the right
  // state on first paint rather than filling in a beat later.
  useEffect(() => {
    if (user) initSaved();
  }, [user, initSaved]);

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
        const feed = user
          ? await socialApi
              .getFeed()
              .then((r) => r.activities)
              .catch(() => [])
          : [];
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

  if (state.error) {
    return <ErrorState error={state.error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-14 md:space-y-20">
      {/* Editorial masthead. The rule and the kicker do the work of making a
          feed feel like a publication rather than a dashboard. */}
      <FadeUp className="border-b border-line pb-6">
        <p className="label-caps mb-3 text-ember">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
        <h1 className="font-display text-[length:var(--text-section)] leading-[1.02] font-black">
          {user ? `${greeting()}` : 'Find the good stuff.'}
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          {user
            ? `Fresh finds and what the people you follow have been eating, ${user.name?.split(' ')[0]}.`
            : 'Curated spots, hidden gems, and the places worth the detour.'}
        </p>
      </FadeUp>

      <section aria-labelledby="trending-heading">
        <SectionHeading
          kicker="Trending this week"
          title="Where everyone’s been going"
          subtitle="Most reviewed in the last 7 days"
          action={
            <Button to="/search?sort=reviews" variant="ghost" size="sm" icon={ArrowRight} iconRight>
              See all
            </Button>
          }
        />
        <h2 id="trending-heading" className="sr-only">
          Trending spots
        </h2>

        {state.loading ? (
          <>
            <div className="sm:hidden">
              <SpotRowSkeleton count={2} />
            </div>
            <div className="hidden sm:block">
              <SpotGridSkeleton count={3} />
            </div>
          </>
        ) : data.trending.length ? (
          <SpotRail spots={data.trending} />
        ) : (
          <EmptyState
            title="Nothing trending just yet"
            hint="Spots reviewed in the past week show up here. Be the first to weigh in on one."
            action={
              <Button to="/search" icon={Compass}>
                Browse all spots
              </Button>
            }
          />
        )}
      </section>

      <section aria-labelledby="gems-heading">
        <SectionHeading
          kicker="Under the radar"
          title="Hidden gems"
          subtitle="Rated 4.5+ by the few people who’ve found them"
        />
        <h2 id="gems-heading" className="sr-only">
          Hidden gems
        </h2>

        {state.loading ? (
          <>
            <div className="sm:hidden">
              <SpotRowSkeleton count={2} />
            </div>
            <div className="hidden sm:block">
              <SpotGridSkeleton count={3} />
            </div>
          </>
        ) : data.gems.length ? (
          <SpotRail spots={data.gems} />
        ) : (
          <EmptyState
            art="search"
            title="No gems unearthed yet"
            hint="Highly rated places with fewer than 20 reviews land here. Rate somewhere quiet and you might make one."
          />
        )}
      </section>

      <section aria-labelledby="feed-heading">
        <SectionHeading
          kicker="Your people"
          title="Friends activity"
          subtitle={user ? 'What the people you follow are up to' : undefined}
        />
        <h2 id="feed-heading" className="sr-only">
          Friends activity
        </h2>

        {!user ? (
          <EmptyState
            title="Eating is better with company"
            hint="Sign in to follow other eaters and see what they’ve been finding."
            action={<Button to="/login">Sign in</Button>}
          />
        ) : state.loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[74px] animate-pulse rounded-card bg-accent-soft" />
            ))}
          </div>
        ) : data.feed.length === 0 ? (
          <EmptyState
            art="search"
            title="Your feed is quiet"
            hint="Follow a few people and their reviews, lists and crawls will show up here."
            action={
              <Button to="/social" icon={Users}>
                Find people to follow
              </Button>
            }
          />
        ) : (
          <Reveal className="space-y-2.5" gap={0.05}>
            {data.feed.map((a) => (
              <RevealItem key={a.id}>
                <motion.article
                  className="flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-[var(--shadow-card)]"
                  whileHover={{ x: 4 }}
                  transition={settle}
                >
                  <Avatar user={a.user} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <Link
                        to={`/profile/${a.user?.id}`}
                        className="font-semibold hover:text-accent"
                      >
                        {a.user?.name}
                      </Link>{' '}
                      {activityLine(a)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{timeAgo(a.createdAt)}</p>
                  </div>
                  {a.spot?.photos?.[0] && (
                    <img
                      src={a.spot.photos[0]}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  )}
                </motion.article>
              </RevealItem>
            ))}
          </Reveal>
        )}
      </section>

      {/* A quiet nudge to contribute, rather than a banner that shouts. */}
      {user && (
        <FadeUp className="flex flex-col items-center gap-3 rounded-panel bg-olive-soft px-6 py-10 text-center">
          <Sparkles size={22} className="text-olive" aria-hidden />
          <h2 className="font-display text-xl font-semibold">Know somewhere that isn’t here?</h2>
          <p className="max-w-sm text-sm text-muted">
            The best spots on FoodSpots got here because one person bothered to add them.
          </p>
          <Button to="/spots/new" variant="olive" className="mt-1">
            Add a spot
          </Button>
        </FadeUp>
      )}
    </div>
  );
}
