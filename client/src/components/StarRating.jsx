import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Star } from 'lucide-react';
import { snap, bounce } from '../motion/index.js';

/**
 * Animated rating counter. The number springs to its target rather than
 * snapping, so a rating that changes (after submitting a review, or when
 * filters reload a list) reads as a value that *moved* instead of one that
 * was swapped out underneath you.
 */
function RatingValue({ value, className = '' }) {
  const raw = useMotionValue(value ?? 0);
  const spring = useSpring(raw, { stiffness: 140, damping: 20 });
  const text = useTransform(spring, (v) => v.toFixed(1));

  useEffect(() => {
    raw.set(value ?? 0);
  }, [value, raw]);

  // The live text is decorative duplication for AT; the parent exposes the
  // real value via aria-label, so this is hidden from the accessibility tree.
  return <motion.span className={className} aria-hidden>{text}</motion.span>;
}

/**
 * One star. Fractional fill is done with a clipped overlay rather than
 * rounding, because a 4.4 that renders as 4 stars quietly lies to the user.
 */
function StarGlyph({ size, fill, interactive, active }) {
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <Star size={size} className="absolute inset-0 text-line-strong" strokeWidth={1.5} />
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }}
      >
        <Star
          size={size}
          className={`fill-amber text-amber ${interactive && active ? 'drop-shadow-[0_2px_6px_rgb(180_83_9/0.45)]' : ''}`}
          strokeWidth={1.5}
          style={{ minWidth: size }}
        />
      </span>
    </span>
  );
}

/**
 * Read-only by default. Pass `onChange` to make it an input (used by the
 * review form and the min-rating filter).
 *
 * Interactive motion: hovering star N lights 1..N and lifts each one with a
 * cascading delay, so the row fills like a wave following the cursor. The
 * committed star gets an extra overshoot on a loose spring — the "satisfying"
 * part is that confirmation feels physically different from preview.
 */
export default function StarRating({
  value = 0,
  onChange,
  size = 16,
  showValue = false,
  label = 'Rating',
}) {
  const interactive = Boolean(onChange);
  const [hover, setHover] = useState(0);
  const [justSet, setJustSet] = useState(0);
  const groupRef = useRef(null);

  const shown = hover || value;
  const current = Math.round(value);

  function commit(star) {
    setJustSet(star);
    onChange(star);
  }

  // Arrow keys move between stars; roving tabindex keeps one stop in the tab
  // order, which is the expected behaviour for a radiogroup.
  function onKeyDown(e) {
    if (!interactive) return;
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = Math.min(5, Math.max(1, (current || 0) + delta));
    commit(next);
    groupRef.current?.querySelector(`[data-star="${next}"]`)?.focus();
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        ref={groupRef}
        className="flex items-center"
        role={interactive ? 'radiogroup' : 'img'}
        aria-label={
          interactive ? label : `${label}: ${Number(value || 0).toFixed(1)} out of 5 stars`
        }
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, shown - star + 1));

          if (!interactive) {
            return (
              <span key={star} className="block px-px">
                <StarGlyph size={size} fill={fill} />
              </span>
            );
          }

          return (
            <motion.button
              key={star}
              type="button"
              role="radio"
              data-star={star}
              tabIndex={star === (current || 1) ? 0 : -1}
              aria-checked={star === current}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              onClick={() => commit(star)}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              /* Padding, not margin: it grows the hit area while leaving the
                 stars visually adjacent, so a 22px star still gets a target
                 worth aiming at. */
              className="cursor-pointer p-2"
              animate={
                justSet === star
                  ? { scale: [1, 1.45, 1], rotate: [0, -12, 0] }
                  : { scale: hover >= star ? 1.18 : 1, y: hover >= star ? -2 : 0 }
              }
              transition={justSet === star ? bounce : { ...snap, delay: hover ? star * 0.025 : 0 }}
              onAnimationComplete={() => justSet === star && setJustSet(0)}
            >
              <StarGlyph size={size} fill={fill} interactive active={hover >= star} />
            </motion.button>
          );
        })}
      </div>

      {showValue && value > 0 && (
        <RatingValue value={Number(value)} className="text-sm font-semibold text-ink tabular-nums" />
      )}
    </div>
  );
}
