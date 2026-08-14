import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { snap } from '../../motion/index.js';

const MotionLink = motion.create(Link);

/*
 * Every variant keeps a 44px minimum touch target at `md` and above, and the
 * icon variant is a hard 44×44 — the single most common accessibility failure
 * in "designed" UIs is a beautiful 32px icon button.
 */
const VARIANTS = {
  primary:
    'bg-accent text-white shadow-[var(--shadow-card)] hover:bg-accent-dark ' +
    'disabled:bg-line disabled:text-muted disabled:shadow-none',
  secondary:
    'bg-surface text-ink border border-line hover:border-accent hover:text-accent ' +
    'disabled:text-muted disabled:hover:border-line',
  olive: 'bg-olive text-white hover:bg-[#3d4a30] disabled:bg-line disabled:text-muted',
  ghost: 'text-ink hover:bg-accent-soft hover:text-accent-dark disabled:text-muted',
  quiet: 'text-muted hover:text-ink hover:bg-accent-soft/60',
  danger: 'bg-danger text-white hover:bg-[#8e1c13] disabled:bg-line disabled:text-muted',
};

const SIZES = {
  // 44px on touch, compact from `md` up. A 36px control is fine under a mouse
  // and a miss under a thumb, so the size follows the input device rather than
  // splitting the difference and being wrong for both.
  sm: 'min-h-11 md:min-h-9 px-3 py-1.5 text-xs gap-1.5 rounded-[10px]',
  md: 'min-h-11 px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'min-h-13 px-6 py-3 text-base gap-2.5 rounded-2xl',
};

/**
 * The one button in the system.
 *
 * Motion: a 0.97 tap scale on a stiff spring. It's small on purpose — the
 * press should register in the finger, not draw the eye. Hover adds a 1px lift
 * via translate (not margin/top) so it composites on the GPU.
 */
const Button = forwardRef(function Button(
  {
    as,
    to,
    href,
    variant = 'primary',
    size = 'md',
    block = false,
    icon: Icon,
    iconRight = false,
    children,
    className = '',
    disabled,
    ...props
  },
  ref,
) {
  const Component = to ? MotionLink : href ? motion.a : as ? motion.create(as) : motion.button;

  const classes = [
    'relative inline-flex items-center justify-center font-medium cursor-pointer',
    'transition-colors duration-[var(--dur-quick)]',
    'disabled:cursor-not-allowed select-none',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    block ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      ref={ref}
      to={to}
      href={href}
      className={classes}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 0 }}
      transition={snap}
      {...props}
    >
      {Icon && !iconRight && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} aria-hidden />}
      {children}
      {Icon && iconRight && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} aria-hidden />}
    </Component>
  );
});

export default Button;

/**
 * Square icon-only button. `label` is required and becomes the accessible
 * name — an icon button without one is invisible to a screen reader.
 */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 44, className = '', to, ...props },
  ref,
) {
  const Component = to ? MotionLink : motion.button;
  return (
    <Component
      ref={ref}
      to={to}
      type={to ? undefined : 'button'}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full cursor-pointer',
        'transition-colors duration-[var(--dur-quick)]',
        VARIANTS[variant] ?? VARIANTS.ghost,
        className,
      ].join(' ')}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={snap}
      {...props}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={1.9} aria-hidden />
    </Component>
  );
});
