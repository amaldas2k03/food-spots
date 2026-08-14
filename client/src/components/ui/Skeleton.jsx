import { motion } from 'framer-motion';
import { useAmbient } from '../../motion/index.js';

/**
 * On-brand skeleton.
 *
 * The shimmer is a warm gradient bar translated across the block on a loop —
 * `transform: translateX` only, never `background-position`, which repaints
 * the whole element every frame. Under reduced motion the sweep is dropped and
 * the block just sits there as a static placeholder.
 */
export function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  const sweep = useAmbient({
    animate: { x: ['-120%', '220%'] },
    transition: { duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.35 },
  });

  return (
    <div
      className={`relative overflow-hidden bg-accent-soft ${rounded} ${className}`}
      aria-hidden
    >
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        {...sweep}
      />
    </div>
  );
}

/** Matches SpotCard's geometry so the layout doesn't shift when data lands. */
export function SpotCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-[var(--shadow-card)]">
      <Skeleton className="aspect-[4/5] w-full" rounded="rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function SpotGridSkeleton({ count = 6 }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading spots"
    >
      {Array.from({ length: count }, (_, i) => (
        <SpotCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SpotRowSkeleton({ count = 4 }) {
  return (
    <div className="flex gap-5 overflow-hidden" role="status" aria-label="Loading spots">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-[74vw] shrink-0 sm:w-64">
          <SpotCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function ReviewSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading reviews">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-card bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" rounded="rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
