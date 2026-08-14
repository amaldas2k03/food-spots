/**
 * Motion tokens — the shared vocabulary for every animation in the app.
 *
 * Three springs, three durations. Anything that needs a timing imports from
 * here rather than inventing its own, which is what keeps eight screens of
 * animation feeling like one hand made them.
 *
 * Everything animates `transform` and `opacity` only. No width, height, top or
 * left — those force layout on every frame and are how a "premium" UI ends up
 * dropping frames on a mid-range phone.
 */

/** Taps, toggles, chips. Stiff and slightly overshooting: feels like a button. */
export const snap = { type: 'spring', stiffness: 520, damping: 30, mass: 0.6 };

/** Cards, panels, drawers, shared-element morphs. The workhorse. */
export const settle = { type: 'spring', stiffness: 260, damping: 28, mass: 0.9 };

/** Parallax, ambient drift, anything the user isn't directly driving. */
export const drift = { type: 'spring', stiffness: 80, damping: 22, mass: 1.1 };

/** A looser spring for the celebratory moments (save confetti, steam). */
export const bounce = { type: 'spring', stiffness: 400, damping: 14, mass: 0.7 };

export const duration = {
  quick: 0.18, // exits
  base: 0.32, // entrances
  slow: 0.6, // hero / page-level
};

/** Expo-out. Fast departure, long graceful settle — reads as "considered". */
export const easeOut = [0.22, 1, 0.36, 1];
export const easeInOut = [0.76, 0, 0.24, 1];

/* ─── Reusable variants ──────────────────────────────────────────────────── */

/**
 * Stagger container. `delayChildren` gives the parent a beat to arrive first,
 * so children feel like they're emerging *from* it rather than racing it.
 */
export const stagger = (staggerChildren = 0.06, delayChildren = 0.04) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/** The default card / list-item entrance. Rise + fade. */
export const riseIn = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: settle },
};

/** For items entering a horizontal rail. */
export const slideIn = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: settle },
};

/** Editorial headline reveal — used with per-word splitting on the landing hero. */
export const wordIn = {
  hidden: { opacity: 0, y: '0.6em', rotate: 2 },
  show: {
    opacity: 1,
    y: '0em',
    rotate: 0,
    transition: { type: 'spring', stiffness: 300, damping: 26 },
  },
};

/** Modals, drawers, popovers. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: settle },
  exit: { opacity: 0, scale: 0.98, transition: { duration: duration.quick, ease: easeOut } },
};

/** Route-level transition. Deliberately restrained so it never fights the
 *  shared-element morph happening on top of it. */
export const pageIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: easeOut } },
  exit: { opacity: 0, y: -8, transition: { duration: duration.quick, ease: easeOut } },
};

/** Standard viewport trigger: fire once, slightly before the element is fully
 *  on screen so the motion completes as the user arrives at it. */
export const inView = { once: true, amount: 0.2, margin: '0px 0px -80px 0px' };

/** Tactile press feedback shared by every interactive surface. */
export const press = { whileTap: { scale: 0.96 }, transition: snap };
export const pressLift = {
  whileHover: { y: -3 },
  whileTap: { scale: 0.97, y: 0 },
  transition: snap,
};
