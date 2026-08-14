import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { UserPlus, UserMinus, Award, Route as RouteIcon, PenLine } from 'lucide-react';
import * as socialApi from '../api/social.js';
import Avatar from '../components/Avatar.jsx';
import ListCard from '../components/ListCard.jsx';
import StarRating from '../components/StarRating.jsx';
import { ErrorState, EmptyState } from '../components/Feedback.jsx';
import { Button, Tag, Reveal, RevealItem, Skeleton } from '../components/ui/index.js';
import { useAuthStore } from '../store/authStore.js';
import { timeAgo, formatDistance, formatDuration } from '../utils/format.js';
import { settle, snap, bounce, useMotionSafe } from '../motion/index.js';

/**
 * A stat that counts up to its value once, on mount.
 *
 * Small thing, but it's the difference between a profile that displays numbers
 * and one that presents them. Reduced motion gets the final value immediately —
 * a counting animation is exactly the kind of motion that setting exists for.
 */
function Stat({ label, value }) {
  const reduced = useMotionSafe();
  const raw = useMotionValue(reduced ? value : 0);
  const spring = useSpring(raw, { stiffness: 60, damping: 18 });
  const rounded = useTransform(spring, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    raw.set(value);
  }, [value, raw]);

  return (
    <div>
      <dd className="font-display text-2xl font-bold text-accent tabular-nums">
        <motion.span aria-hidden>{rounded}</motion.span>
        <span className="sr-only">{value}</span>
      </dd>
      <dt className="label-caps mt-1 text-muted">{label}</dt>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="flex items-start gap-5 rounded-panel bg-surface p-6 shadow-[var(--shadow-card)]">
        <Skeleton className="h-20 w-20 shrink-0" rounded="rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" rounded="rounded-card" />
        ))}
      </div>
    </div>
  );
}

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
        user: {
          ...d.user,
          _count: { ...d.user._count, followers: d.user._count.followers + (next ? 1 : -1) },
        },
      }));
    } finally {
      setFollowBusy(false);
    }
  }

  if (state.loading) return <ProfileSkeleton />;
  if (state.error) return <ErrorState error={state.error} />;
  if (!data) return null;

  const { user, reviews, lists, crawls } = data;
  const isMe = me?.id === user.id;

  const counts = {
    reviews: reviews.length,
    lists: lists.length,
    badges: user.badges.length,
    crawls: crawls.length,
  };

  return (
    <div>
      <motion.header
        className="relative overflow-hidden rounded-panel bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={settle}
      >
        {/* A warm wash behind the avatar so the header has some depth without
            needing a cover photo we don't have. */}
        <div
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-ember-glow), transparent 70%)' }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <motion.div
            initial={{ scale: 0.8, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={bounce}
            className="shrink-0"
          >
            <Avatar user={user} size={80} />
          </motion.div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-black sm:text-3xl">{user.name}</h1>

            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              <Stat label="Points" value={user.points} />
              <Stat label="Reviews" value={user._count.reviews} />
              <Stat label="Followers" value={user._count.followers} />
              <Stat label="Following" value={user._count.following} />
            </dl>

            {user.tasteProfile?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {user.tasteProfile.map((t) => (
                  <Tag key={t} tone="olive">
                    {t}
                  </Tag>
                ))}
              </div>
            )}
          </div>

          {me && !isMe && (
            <Button
              onClick={toggleFollow}
              disabled={followBusy}
              variant={data.isFollowing ? 'secondary' : 'primary'}
              icon={data.isFollowing ? UserMinus : UserPlus}
              className="shrink-0"
            >
              {data.isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
      </motion.header>

      <nav className="scroll-row mt-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={`relative min-h-11 shrink-0 cursor-pointer px-4 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'text-accent-dark' : 'text-muted hover:text-ink'
            }`}
          >
            {t} <span className="text-xs opacity-70">({counts[t]})</span>
            {tab === t && (
              <motion.span
                layoutId="profile-tab"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                transition={settle}
                aria-hidden
              />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'reviews' &&
              (reviews.length === 0 ? (
                <EmptyState
                  title={isMe ? 'You haven’t written one yet' : 'No reviews yet'}
                  hint={
                    isMe
                      ? 'Been somewhere good lately? Somebody is looking for exactly that.'
                      : undefined
                  }
                  action={
                    isMe ? (
                      <Button to="/search" icon={PenLine}>
                        Find a spot to review
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2" gap={0.05}>
                  {reviews.map((r) => (
                    <RevealItem key={r.id}>
                      <motion.article
                        className="h-full rounded-card bg-surface p-4 shadow-[var(--shadow-card)]"
                        whileHover={{ y: -4 }}
                        transition={snap}
                      >
                        <Link
                          to={`/spots/${r.spot.id}`}
                          className="flex items-center gap-3 hover:text-accent"
                        >
                          {r.spot.photos?.[0] && (
                            <img
                              src={r.spot.photos[0]}
                              alt=""
                              loading="lazy"
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-display font-semibold">{r.spot.name}</p>
                            <p className="truncate text-xs text-muted">
                              {r.spot.cuisineType?.join(' · ')}
                            </p>
                          </div>
                        </Link>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StarRating value={r.overallRating} size={13} label="Their rating" />
                          <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
                          {r.verifiedVisit && (
                            <span className="rounded-chip bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                              Verified
                            </span>
                          )}
                        </div>

                        <p className="mt-2 line-clamp-3 font-display text-sm leading-relaxed">
                          {r.text}
                        </p>
                      </motion.article>
                    </RevealItem>
                  ))}
                </Reveal>
              ))}

            {tab === 'lists' &&
              (lists.length === 0 ? (
                <EmptyState title="No lists yet" art="search" />
              ) : (
                <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
                  {lists.map((l) => (
                    <RevealItem key={l.id}>
                      <ListCard list={l} />
                    </RevealItem>
                  ))}
                </Reveal>
              ))}

            {tab === 'badges' &&
              (user.badges.length === 0 ? (
                <EmptyState
                  title="No badges yet"
                  hint="Badges are earned by reviewing, curating and exploring."
                />
              ) : (
                <Reveal
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                  gap={0.06}
                >
                  {user.badges.map((b) => (
                    <RevealItem key={b}>
                      <motion.div
                        className="flex h-full flex-col items-center gap-2.5 rounded-card bg-surface p-5 text-center shadow-[var(--shadow-card)]"
                        whileHover={{ y: -4, rotate: -1.5 }}
                        transition={snap}
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
                          <Award size={22} className="text-accent" aria-hidden />
                        </span>
                        <span className="text-sm font-semibold">{b}</span>
                      </motion.div>
                    </RevealItem>
                  ))}
                </Reveal>
              ))}

            {tab === 'crawls' &&
              (crawls.length === 0 ? (
                <EmptyState title="No food crawls yet" art="search" />
              ) : (
                <Reveal className="space-y-3" gap={0.05}>
                  {crawls.map((c) => (
                    <RevealItem key={c.id}>
                      <article className="rounded-card bg-surface p-4 shadow-[var(--shadow-card)]">
                        <div className="flex items-center gap-2">
                          <RouteIcon size={16} className="text-accent" aria-hidden />
                          <h3 className="font-display text-base font-semibold">{c.title}</h3>
                        </div>

                        <p className="mt-1 text-xs text-muted">
                          {c.stops.length} stops
                          {c.totalDistance ? ` · ${formatDistance(c.totalDistance)}` : ''}
                          {c.totalEta ? ` · ${formatDuration(c.totalEta)}` : ''}
                        </p>

                        {/* Numbered as a route, with connectors, so it reads as
                            an itinerary rather than a bag of tags. */}
                        <ol className="mt-3 flex flex-wrap items-center gap-1.5">
                          {c.stops.map((s, i) => (
                            <li key={s.id} className="flex items-center gap-1.5">
                              {i > 0 && (
                                <span className="h-px w-3 bg-line-strong" aria-hidden />
                              )}
                              <span className="flex items-center gap-1.5 rounded-chip bg-bg px-3 py-1.5 text-xs">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                                  {i + 1}
                                </span>
                                {s.name}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </article>
                    </RevealItem>
                  ))}
                </Reveal>
              ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
