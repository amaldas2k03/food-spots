/**
 * Torn-paper edge between sections.
 *
 * The path is a hand-tuned irregular rip rather than a generated wave —
 * a mathematically even wave reads as a "shape divider" widget, which is the
 * opposite of the handmade feel we're after. `preserveAspectRatio="none"`
 * lets it stretch to any width without the tear repeating visibly.
 */
export default function TornDivider({ fill = 'var(--color-bg)', flip = false, className = '' }) {
  return (
    <div
      className={`pointer-events-none relative w-full leading-[0] ${className}`}
      style={{ transform: flip ? 'scaleY(-1)' : undefined }}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 44"
        preserveAspectRatio="none"
        className="block h-[26px] w-full sm:h-[38px]"
        fill="none"
      >
        <path
          d="M0 44V18c38-3 62 5 96 7s52-9 88-11 58 8 94 6 56-12 92-11 60 13 96 12 54-14 90-13 62 12 98 11 56-11 92-10 60 12 96 11 54-13 90-12 62 11 98 10 56-9 92-8 58 9 94 8 54-8 90-7v33H0Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
