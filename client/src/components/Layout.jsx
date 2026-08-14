import { useOutlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import { pageIn } from '../motion/index.js';

/**
 * App shell.
 *
 * Mobile: top bar + bottom nav, content between them.
 * Desktop (md+): top bar + left rail, content offset by the rail.
 *
 * The rail offset carries an `md:` prefix rather than applying unconditionally
 * — an unprefixed 232px left margin is what made the previous layout unusable
 * below 768px.
 *
 * Every routed page goes through this one element. That's deliberate: keeping
 * a single AnimatePresence alive across route changes is what lets a spot
 * card's photo morph into the detail page's hero, since a shared `layoutId`
 * only matches when both elements live under the same presence tree. Pages
 * that need to run edge-to-edge use <Bleed> instead of a second Layout.
 *
 * `mode="popLayout"` (rather than "wait") keeps the outgoing page mounted and
 * out of flow while the incoming one arrives, so the two shared elements
 * overlap for the frame the morph needs. "wait" would unmount the source
 * first and there would be nothing to morph from.
 *
 * The outlet comes from `useOutlet()`, not `<Outlet />`, and that distinction
 * is load-bearing. `<Outlet />` resolves the matched route from context at
 * render time, so the copy AnimatePresence is holding open to animate *out*
 * re-renders as the route it's animating *to* — you get two live copies of the
 * incoming page, one of them stuck at `position: absolute` forever. `useOutlet`
 * returns an element with the match already baked in, so the exiting copy stays
 * the page the user is actually leaving.
 */
export default function Layout() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div className="grain min-h-screen">
      <Navbar />
      <Sidebar />

      <main
        id="main"
        className="mt-(--spacing-navbar) min-h-[calc(100vh-var(--spacing-navbar))] md:ml-(--spacing-sidebar)"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageIn}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mx-auto max-w-6xl px-4 pt-6 pb-8 sm:px-6 mb-safe-nav md:mb-0 md:pt-8"
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
