import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { snap, settle } from '../../motion/index.js';

const TONES = {
  terracotta: {
    fill: 'bg-accent-soft',
    ring: 'border-accent',
    text: 'text-accent-dark',
    idle: 'border-line text-muted hover:border-accent hover:text-accent-dark',
  },
  olive: {
    fill: 'bg-olive-soft',
    ring: 'border-olive',
    text: 'text-olive',
    idle: 'border-line text-muted hover:border-olive hover:text-olive',
  },
};

/**
 * Cuisine / vibe / price filter chip.
 *
 * The selected state doesn't just swap a class. A tinted fill scales up from
 * the chip's centre behind the label, and a checkmark springs in while the
 * label slides over to make room. Scale and x only — the chip's box never
 * changes size, so a row of chips never reflows when one is toggled. That's
 * what makes rapid multi-select feel solid instead of twitchy.
 */
export default function Chip({
  selected = false,
  onToggle,
  children,
  tone = 'terracotta',
  showCheck = true,
  className = '',
  ...props
}) {
  const t = TONES[tone] ?? TONES.terracotta;

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={[
        /* 44px tall on touch, tightened from `md` up — filter chips are a
           primary thumb target inside the mobile drawer. */
        'relative inline-flex min-h-11 md:min-h-9 cursor-pointer items-center gap-1.5 overflow-hidden',
        'rounded-chip border px-3.5 py-1.5 text-xs font-medium',
        'transition-colors duration-[var(--dur-quick)]',
        selected ? `${t.ring} ${t.text}` : t.idle,
        className,
      ].join(' ')}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={snap}
      {...props}
    >
      {/* Fill lives behind the label and scales from centre. */}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            key="fill"
            className={`absolute inset-0 -z-0 ${t.fill}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={settle}
            style={{ originX: 0.5, originY: 0.5 }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {selected && showCheck && (
          <motion.span
            key="check"
            className="relative z-10 flex items-center"
            initial={{ scale: 0, width: 0, opacity: 0 }}
            animate={{ scale: 1, width: 'auto', opacity: 1 }}
            exit={{ scale: 0, width: 0, opacity: 0 }}
            transition={snap}
            aria-hidden
          >
            <Check size={13} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>

      <span className="relative z-10 whitespace-nowrap">{children}</span>
    </motion.button>
  );
}

/** Non-interactive tag used on cards and detail pages. */
export function Tag({ tone = 'terracotta', children, className = '' }) {
  const t = TONES[tone] ?? TONES.terracotta;
  return (
    <span
      className={`inline-flex items-center rounded-chip ${t.fill} ${t.text} label-caps px-2.5 py-1 ${className}`}
    >
      {children}
    </span>
  );
}
