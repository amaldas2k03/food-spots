import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Map, Search, Route, Bookmark, Users, Trophy, MapPinPlus } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { settle } from '../motion/index.js';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/crawl', label: 'Crawl', icon: Route },
  { to: '/lists', label: 'Saved', icon: Bookmark },
  { to: '/social', label: 'Social', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

/**
 * One nav row. The active background is a single shared element that slides
 * between items via `layoutId` — so moving between sections reads as one
 * indicator travelling down the list, not seven independent fades. That
 * continuity is what tells the user the nav is a place, not a set of buttons.
 */
function Item({ to, label, icon: Icon, end }) {
  return (
    <NavLink to={to} end={end} className="group relative block">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-xl bg-accent-soft"
              transition={settle}
              aria-hidden
            />
          )}
          <motion.span
            className={`relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors ${
              isActive ? 'font-semibold text-accent-dark' : 'text-ink group-hover:text-accent-dark'
            }`}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.98 }}
            transition={settle}
          >
            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} aria-hidden />
            {label}
          </motion.span>
        </>
      )}
    </NavLink>
  );
}

/** Desktop-only rail. Mobile navigation lives in <BottomNav>. */
export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside
      className="fixed top-(--spacing-navbar) bottom-0 left-0 hidden w-(--spacing-sidebar) border-r border-line bg-surface/60 md:block"
      aria-label="Main navigation"
    >
      <nav className="flex flex-col gap-1 p-3">
        {NAV.map((item) => (
          <Item key={item.to} {...item} />
        ))}

        {/* Adding a spot needs an account, so it only appears once signed in. */}
        {user && (
          <div className="mt-3 border-t border-line pt-3">
            <Item to="/spots/new" label="Add a spot" icon={MapPinPlus} />
          </div>
        )}
      </nav>

      <p className="absolute right-4 bottom-5 left-4 font-display text-xs leading-relaxed text-muted italic">
        “The best table is the one you had to be told about.”
      </p>
    </aside>
  );
}
