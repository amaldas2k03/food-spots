import { useReducedMotion } from 'framer-motion';

/**
 * Reduced-motion helpers.
 *
 * `<MotionConfig reducedMotion="user">` in App.jsx already neutralises
 * transform and layout animations globally, keeping opacity so nothing simply
 * pops into place. These hooks cover the two cases it can't reach:
 *
 *   - scroll-linked values built by hand with useScroll/useTransform
 *   - looping ambient animations, which should stop entirely rather than
 *     shrink, because a reduced-motion user does not want a permanent
 *     low-amplitude wobble in their peripheral vision
 */

/** True when the user has asked for less motion. */
export function useMotionSafe() {
  return useReducedMotion() === true;
}

/**
 * Collapses a parallax range to zero when reduced motion is on.
 * `useTransform(progress, [0, 1], useParallaxRange(['0%', '18%']))`
 */
export function useParallaxRange(range) {
  const reduced = useMotionSafe();
  if (!reduced) return range;
  // Match the output type (%, px, unitless) so useTransform stays happy.
  return range.map((v) => (typeof v === 'number' ? 0 : String(v).replace(/-?[\d.]+/, '0')));
}

/**
 * Returns the animation props for a looping ambient effect, or an empty object
 * when reduced motion is on — the element renders in its resting state.
 */
export function useAmbient(animation) {
  const reduced = useMotionSafe();
  return reduced ? {} : animation;
}
