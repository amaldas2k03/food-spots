import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { snap, bounce, useMotionSafe } from '../../motion/index.js';

/*
 * Three wisps, each a different curve and length so the plume never looks
 * mirrored. Drawn in a 40×48 box that sits directly above the heart.
 */
const WISPS = [
  { d: 'M20 46C14 38 25 32 19 24C14 17 22 11 20 4', delay: 0, x: 0, dur: 1.5 },
  { d: 'M11 45C7 39 14 34 10 27C7 22 12 18 11 13', delay: 0.1, x: -3, dur: 1.3 },
  { d: 'M29 45C33 39 26 34 30 27C33 22 28 18 29 13', delay: 0.17, x: 3, dur: 1.3 },
];

/**
 * Steam plume. Each wisp draws itself (pathLength 0→1) while the whole group
 * rises and dissipates — the same way steam actually behaves, rather than a
 * generic particle burst. Reduced motion skips it entirely.
 */
function Steam() {
  return (
    <motion.svg
      className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2"
      width="40"
      height="48"
      viewBox="0 0 40 48"
      fill="none"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      {WISPS.map((w, i) => (
        <motion.path
          key={i}
          d={w.d}
          stroke="var(--color-ember)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0, y: 6, x: 0 }}
          animate={{
            pathLength: [0, 1, 1],
            opacity: [0, 0.85, 0],
            y: [6, -6, -20],
            x: [0, w.x, w.x * 2.2],
          }}
          transition={{ duration: w.dur, delay: w.delay, ease: 'easeOut', times: [0, 0.45, 1] }}
        />
      ))}
    </motion.svg>
  );
}

/**
 * Save / favourite control — the app's signature interaction.
 *
 * Saving does three things at once: the heart overshoots on a loose spring and
 * fills, a warm ring pulses outward, and steam curls off the top. It fires only
 * on save (never on un-save), so the reward stays tied to the positive action
 * and doesn't become noise.
 */
export default function SaveButton({
  saved = false,
  onToggle,
  size = 44,
  label,
  variant = 'floating',
  className = '',
}) {
  const reduced = useMotionSafe();
  const [burst, setBurst] = useState(0);

  function handle(e) {
    // Cards wrap this in a Link — saving should never navigate.
    e.preventDefault();
    e.stopPropagation();
    if (!saved && !reduced) setBurst((n) => n + 1);
    onToggle?.(!saved);
  }

  const accessibleName = label ?? (saved ? 'Remove from saved spots' : 'Save this spot');

  return (
    <div className={`relative inline-flex ${className}`}>
      <AnimatePresence>
        {burst > 0 && <Steam key={burst} />}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handle}
        aria-pressed={saved}
        aria-label={accessibleName}
        title={accessibleName}
        style={{ width: size, height: size }}
        className={[
          'relative inline-flex cursor-pointer items-center justify-center rounded-full',
          'transition-colors duration-[var(--dur-quick)]',
          variant === 'floating'
            ? 'bg-surface/92 shadow-[var(--shadow-card)] backdrop-blur-sm hover:bg-surface'
            : 'border border-line bg-surface hover:border-accent',
        ].join(' ')}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        transition={snap}
      >
        {/* Ring pulse — scale/opacity only, so it costs nothing to composite. */}
        <AnimatePresence>
          {burst > 0 && (
            <motion.span
              key={burst}
              className="absolute inset-0 rounded-full border-2 border-ember"
              initial={{ scale: 0.7, opacity: 0.9 }}
              animate={{ scale: 1.9, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              aria-hidden
            />
          )}
        </AnimatePresence>

        <motion.span
          animate={saved ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={bounce}
          className="flex"
        >
          <Heart
            size={Math.round(size * 0.44)}
            strokeWidth={2}
            className={
              saved ? 'fill-accent text-accent' : 'text-muted transition-colors hover:text-accent'
            }
          />
        </motion.span>
      </motion.button>
    </div>
  );
}
