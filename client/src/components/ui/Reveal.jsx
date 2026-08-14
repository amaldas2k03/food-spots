import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { stagger, riseIn, inView, wordIn } from '../../motion/index.js';

/**
 * Scroll-triggered reveal wrappers.
 *
 * `once: true` matters as much as the animation itself — content that re-animates
 * every time it re-enters the viewport is exhausting to scroll past, and it
 * makes a long feed feel unstable.
 */

/** Wraps a group; children marked with <RevealItem> arrive in sequence. */
export function Reveal({ children, className = '', gap = 0.06, delay = 0.04, as = 'div' }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component
      className={className}
      variants={stagger(gap, delay)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      {children}
    </Component>
  );
}

/** A single staggered child. Must be inside <Reveal>. */
export function RevealItem({ children, className = '', variants = riseIn, ...props }) {
  return (
    <motion.div className={className} variants={variants} {...props}>
      {children}
    </motion.div>
  );
}

/** Standalone reveal for a single element with no siblings to stagger. */
export function FadeUp({ children, className = '', delay = 0, ...props }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={inView}
      transition={{ type: 'spring', stiffness: 260, damping: 28, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Editorial headline that reveals word by word.
 *
 * Split by word rather than by character: per-character animation on a serif
 * display face breaks the kerning as letters move independently, and it takes
 * far longer to resolve than a reader wants to wait for a headline.
 *
 * Each word sits in an `overflow-hidden` mask so it rises out of a clean edge
 * instead of fading in place. The gap between words is an explicit em margin,
 * because a literal space inside an inline-block collapses and the words would
 * run together. The whole run is aria-hidden with the real text on the heading,
 * so assistive tech reads one clean string.
 */
export function SplitHeading({ text, className = '', as = 'h1', delay = 0, ...props }) {
  const Component = motion[as] ?? motion.h1;
  const words = text.split(' ');

  return (
    <Component
      className={className}
      variants={stagger(0.055, delay)}
      initial="hidden"
      animate="show"
      aria-label={text}
      {...props}
    >
      <span aria-hidden>
        {words.map((word, i) => (
          <Fragment key={word + i}>
            <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span className="inline-block" variants={wordIn}>
                {word}
              </motion.span>
            </span>
            {/* A real space as a sibling text node, not a margin: an
                inline-block's own trailing space collapses, but a text node
                between two of them renders — and stays selectable, copyable
                and visible to text extraction. */}
            {i < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </Component>
  );
}
