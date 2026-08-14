import { motion } from 'framer-motion';
import { settle, bounce, useAmbient } from '../motion/index.js';
import Button from './ui/Button.jsx';

/*
 * Empty and error states get illustrations and a voice.
 *
 * These are the moments a user is most likely to bounce, and a centred line of
 * grey text is a dead end. Each one names what happened in plain language and
 * offers the next move. The art is inline SVG — a handful of paths, no network
 * request, and it inherits the palette so it can never drift out of brand.
 */

/** An empty plate with a fork and knife. Used for "nothing here yet". */
function EmptyPlate() {
  const wobble = useAmbient({
    animate: { rotate: [0, -2.5, 0, 2.5, 0] },
    transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
  });

  return (
    <motion.svg width="104" height="88" viewBox="0 0 104 88" fill="none" aria-hidden {...wobble}>
      <ellipse cx="52" cy="50" rx="30" ry="29" fill="var(--color-accent-soft)" />
      <ellipse
        cx="52"
        cy="50"
        rx="30"
        ry="29"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
        fill="none"
      />
      <ellipse cx="52" cy="50" rx="20" ry="19" stroke="var(--color-line-strong)" strokeWidth="2" />
      {/* fork */}
      <path
        d="M15 24v14c0 3 2 5 4 5v25M15 24v10M19 24v10M23 24v14"
        stroke="var(--color-olive)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* knife */}
      <path
        d="M87 24c4 4 4 14 0 19v25"
        stroke="var(--color-olive)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* a crumb, because the plate was not always empty */}
      <circle cx="60" cy="56" r="2.5" fill="var(--color-ember)" />
    </motion.svg>
  );
}

/** A tipped-over cup. Used for errors. */
function SpilledCup() {
  return (
    <svg width="104" height="88" viewBox="0 0 104 88" fill="none" aria-hidden>
      <g transform="rotate(-24 52 44)">
        <path
          d="M34 30h36l-4 26a8 8 0 0 1-8 7H46a8 8 0 0 1-8-7L34 30Z"
          fill="var(--color-accent-soft)"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M70 36h5a7 7 0 0 1 0 14h-4"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M20 74c8 0 10-6 20-6s14 6 26 6 12-4 20-4"
        stroke="var(--color-ember)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A magnifier over an empty map. Used for zero search results. */
function NoResults() {
  return (
    <svg width="104" height="88" viewBox="0 0 104 88" fill="none" aria-hidden>
      <rect
        x="18"
        y="16"
        width="68"
        height="56"
        rx="8"
        fill="var(--color-olive-soft)"
        stroke="var(--color-olive)"
        strokeWidth="2.5"
      />
      <path
        d="M18 40l18-8 16 8 16-9 18 8"
        stroke="var(--color-olive)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".55"
      />
      <circle
        cx="58"
        cy="50"
        r="15"
        fill="var(--color-bg)"
        stroke="var(--color-accent)"
        strokeWidth="3"
      />
      <path d="M69 61l11 11" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const ART = { plate: EmptyPlate, cup: SpilledCup, search: NoResults };

/**
 * Loading state. Prefer a <Skeleton> from ui/ when the shape of the incoming
 * content is known — this exists for the cases where it genuinely isn't
 * (session boot, route-level suspense).
 */
export function Spinner({ label = 'Warming things up…' }) {
  const spin = useAmbient({
    animate: { rotate: 360 },
    transition: { duration: 1.1, repeat: Infinity, ease: 'linear' },
  });

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 text-muted"
      role="status"
      aria-live="polite"
    >
      {/* A ring with a gap rather than a stock spinner glyph — same idea,
          but it's ours and it uses the palette. */}
      <motion.svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden {...spin}>
        <circle cx="17" cy="17" r="14" stroke="var(--color-accent-soft)" strokeWidth="3.5" />
        <path
          d="M31 17A14 14 0 0 0 17 3"
          stroke="var(--color-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </motion.svg>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'That didn’t go to plan' }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-3 rounded-panel bg-surface px-6 py-12 text-center shadow-[var(--shadow-card)]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={settle}
      role="alert"
    >
      <SpilledCup />
      {/* h2, not h3: these states sit directly under a page's h1, and jumping
          a level leaves a hole in the heading outline screen-reader users
          navigate by. */}
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted">
        {String(error?.message ?? error ?? 'Something went wrong on our end.')}
      </p>
      {onRetry && (
        <Button variant="primary" size="md" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </motion.div>
  );
}

export function EmptyState({ title, hint, action, art = 'plate' }) {
  const Art = ART[art] ?? EmptyPlate;

  return (
    <motion.div
      className="flex flex-col items-center gap-3 rounded-panel bg-surface px-6 py-12 text-center shadow-[var(--shadow-card)]"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={bounce}
    >
      <Art />
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}

/**
 * Section header. The rule to the right of the title is the small editorial
 * detail that makes a feed read like a magazine contents page rather than a
 * list of divs.
 */
export function SectionHeading({ title, subtitle, action, kicker }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <p className="label-caps mb-1.5 text-ember">{kicker}</p>}
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}
