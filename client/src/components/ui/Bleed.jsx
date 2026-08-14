/**
 * Escapes the Layout's centred content container to run edge to edge.
 *
 * Every routed page shares one `<Layout>` element so that React never unmounts
 * and remounts the shell between routes — which is what allows a card's photo
 * to morph into the detail page's hero (a shared `layoutId` needs both the old
 * and new element inside the same AnimatePresence). The cost of that decision
 * is that a page wanting a full-width hero has to break out of the container
 * rather than being handed a different one, which is what this does.
 *
 * Width is the *main area*, not the viewport: on desktop the fixed rail owns
 * the left 232px, so a true `100vw` would slide underneath it. `body` carries
 * `overflow-x: hidden` for the scrollbar-width sliver that 100vw includes.
 */
export default function Bleed({ children, flush = false, flushBottom = false, className = '' }) {
  return (
    <div
      className={[
        'relative left-1/2 w-screen -translate-x-1/2',
        'md:w-[calc(100vw-var(--spacing-sidebar))]',
        // Cancels the container's own top padding so a hero starts flush
        // against the navbar.
        flush ? '-mt-6 md:-mt-8' : '',
        // For pages that own the whole viewport (the map), so the container's
        // bottom padding doesn't introduce a stray scroll.
        flushBottom ? '-mb-8' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
