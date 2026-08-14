import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Compass, MapPinned, Star } from 'lucide-react';
import * as spotsApi from '../api/spots.js';
import SpotCard from '../components/SpotCard.jsx';
import {
  Bleed,
  Button,
  Chip,
  Reveal,
  RevealItem,
  FadeUp,
  SplitHeading,
  TornDivider,
  SpotRowSkeleton,
} from '../components/ui/index.js';
import { VIBES } from '../utils/vibes.js';
import { drift, settle, useMotionSafe, useParallaxRange } from '../motion/index.js';

const IMG = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80`;

/* The same photographs the seed data uses, so the landing page and the feed
   below it are visibly the same world. */
const COLLAGE = [
  { id: '1585937421612-70a008356fbe', shape: 'blob-a', label: 'Ghee podi dosa' },
  { id: '1565299624946-b28f40a0ae38', shape: 'blob-b', label: 'Wood-fired pizza' },
  { id: '1557872943-16a5ac26437e', shape: 'arch', label: 'Late-night ramen' },
];

/**
 * A single collage photo. Each one drifts at its own rate as the page scrolls
 * and breathes on a long, offset loop, so the group never moves in lockstep —
 * that unsynchronised drift is what makes it read as a hand-arranged
 * arrangement of prints rather than three divs.
 */
function CollageImage({ item, index, scrollProgress }) {
  const reduced = useMotionSafe();
  const depth = [0.35, -0.22, 0.14][index];
  const y = useTransform(
    scrollProgress,
    [0, 1],
    useParallaxRange([`0%`, `${depth * 100}%`]),
  );

  return (
    <motion.figure
      style={{ y }}
      className={`relative ${['col-span-7 row-span-2', 'col-span-5', 'col-span-5'][index]}`}
      initial={{ opacity: 0, scale: 0.88, rotate: index === 1 ? 4 : -3 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ ...settle, delay: 0.15 + index * 0.12 }}
    >
      <motion.div
        className="grade-warm relative overflow-hidden shadow-[var(--shadow-lift)]"
        animate={reduced ? {} : { y: [0, -9, 0] }}
        transition={{ duration: 7 + index * 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={IMG(item.id)}
          alt={item.label}
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className={`aspect-square h-full w-full object-cover ${item.shape}`}
        />
      </motion.div>
    </motion.figure>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const reduced = useMotionSafe();

  const [featured, setFeatured] = useState(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  // The headline drifts up slightly faster than the page, and fades as it goes.
  const heroTextY = useTransform(scrollYProgress, [0, 1], useParallaxRange(['0%', '-38%']));
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], reduced ? [1, 1] : [1, 0]);

  useEffect(() => {
    let cancelled = false;
    spotsApi
      .getTrending()
      .then((spots) => !cancelled && setFeatured(spots.slice(0, 6)))
      .catch(() => !cancelled && setFeatured([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Bleed flush className="overflow-x-clip">
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative px-4 pt-10 pb-16 sm:px-6 md:pt-20 md:pb-28"
        aria-labelledby="hero-heading"
      >
        {/* Warm light bleeding in from the top-right, behind everything. */}
        <div
          className="pointer-events-none absolute -top-32 -right-24 h-[560px] w-[560px] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, var(--color-ember-glow) 0%, transparent 68%)',
          }}
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-14">
          <motion.div style={{ y: heroTextY, opacity: heroOpacity }}>
            <motion.p
              className="label-caps mb-5 flex items-center gap-2 text-ember"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...settle, delay: 0.05 }}
            >
              <span className="inline-block h-px w-8 bg-ember" aria-hidden />
              Bengaluru & beyond
            </motion.p>

            <SplitHeading
              as="h1"
              id="hero-heading"
              text="Find the good stuff."
              className="font-display text-[length:var(--text-hero)] leading-[0.94] font-black tracking-[-0.03em]"
            />

            <motion.p
              className="mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...settle, delay: 0.45 }}
            >
              Not the top ten lists. The{' '}
              <span className="doodle-underline font-semibold text-ink">
                counter with four stools
              </span>{' '}
              that someone had to tell you about. Find them, save them, pass them on.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...settle, delay: 0.58 }}
            >
              <Button to="/search" size="lg" icon={Compass}>
                Start exploring
              </Button>
              <Button to="/map" size="lg" variant="secondary" icon={MapPinned}>
                Open the map
              </Button>
            </motion.div>

            <motion.dl
              className="mt-10 flex gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
            >
              {[
                ['Spots mapped', '240+'],
                ['Reviews written', '1.8k'],
                ['Hidden gems', '61'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dd className="font-display text-2xl font-bold text-accent">{value}</dd>
                  <dt className="label-caps mt-1 text-muted">{label}</dt>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          <div className="grid grid-cols-12 grid-rows-2 gap-4 sm:gap-5">
            {COLLAGE.map((item, i) => (
              <CollageImage key={item.id} item={item} index={i} scrollProgress={scrollYProgress} />
            ))}
          </div>
        </div>

        {/* Scroll cue — drops and fades on a loop, and disappears entirely
            once the user has started scrolling. */}
        <motion.div
          className="mt-14 flex justify-center md:mt-20"
          style={{ opacity: heroOpacity }}
          aria-hidden
        >
          <motion.span
            className="label-caps flex flex-col items-center gap-2 text-muted"
            animate={reduced ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Scroll
            <span className="h-10 w-px bg-gradient-to-b from-line-strong to-transparent" />
          </motion.span>
        </motion.div>
      </section>

      {/* ─── Vibes ──────────────────────────────────────────────────────── */}
      <section className="relative bg-olive-soft py-16 md:py-24" aria-labelledby="vibes-heading">
        <TornDivider fill="var(--color-bg)" className="absolute inset-x-0 top-0 -translate-y-px" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp>
            <p className="label-caps mb-3 text-olive">Start with a mood</p>
            <h2
              id="vibes-heading"
              className="max-w-2xl font-display text-[length:var(--text-section)] font-bold"
            >
              What are you actually in the mood for?
            </h2>
          </FadeUp>

          <Reveal className="mt-8 flex flex-wrap gap-3" gap={0.05}>
            {VIBES.map((vibe) => (
              <RevealItem key={vibe.id}>
                <Chip
                  tone="olive"
                  showCheck={false}
                  onToggle={() => navigate(`/search?vibe=${vibe.id}`)}
                  className="bg-bg px-5 py-3 text-sm"
                >
                  {vibe.label}
                </Chip>
              </RevealItem>
            ))}
          </Reveal>
        </div>

        <TornDivider
          fill="var(--color-bg)"
          flip
          className="absolute inset-x-0 bottom-0 translate-y-px"
        />
      </section>

      {/* ─── Featured ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24" aria-labelledby="featured-heading">
        <FadeUp className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="label-caps mb-3 flex items-center gap-2 text-ember">
              <Star size={13} className="fill-ember" aria-hidden /> Trending this week
            </p>
            <h2
              id="featured-heading"
              className="font-display text-[length:var(--text-section)] font-bold"
            >
              Where everyone’s been going
            </h2>
          </div>
          <Button to="/search?sort=reviews" variant="ghost" size="sm" icon={ArrowRight} iconRight>
            See all
          </Button>
        </FadeUp>

        {featured === null ? (
          <SpotRowSkeleton count={3} />
        ) : featured.length === 0 ? (
          <p className="rounded-panel bg-surface px-6 py-12 text-center text-sm text-muted shadow-[var(--shadow-card)]">
            No spots to show yet — the feed fills up as people add and review places.
          </p>
        ) : (
          <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" gap={0.08}>
            {featured.map((spot) => (
              <RevealItem key={spot.id}>
                <SpotCard spot={spot} />
              </RevealItem>
            ))}
          </Reveal>
        )}
      </section>

      {/* ─── Closing CTA ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-charcoal px-4 py-20 text-center sm:px-6 md:py-28">
        <motion.div
          className="pointer-events-none absolute -bottom-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-ember) 0%, transparent 70%)' }}
          animate={reduced ? {} : { scale: [1, 1.15, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />

        <FadeUp className="relative mx-auto max-w-2xl">
          <h2 className="font-display text-[length:var(--text-section)] font-bold text-bg">
            Everyone knows one place worth the detour.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-bg/70">
            Add yours. Somebody three neighbourhoods over is looking for exactly it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/register" size="lg">
              Create an account
            </Button>
            <Button
              to="/search"
              size="lg"
              variant="ghost"
              className="text-bg hover:bg-white/10 hover:text-bg"
            >
              Just browse for now
            </Button>
          </div>
        </FadeUp>
      </section>
    </Bleed>
  );
}
