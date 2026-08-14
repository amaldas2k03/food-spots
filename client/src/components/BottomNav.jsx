import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Map, Search, Bookmark, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { settle, snap } from '../motion/index.js';

/**
 * Five destinations, hard limit.
 *
 * The desktop rail carries seven; Crawl, Social and Leaderboard are reachable
 * from Home and Profile on a phone. Cramming seven targets into a 375px bar
 * gives every one of them a sub-44px tap area, which is the more expensive
 * mistake.
 */
const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/lists', label: 'Saved', icon: Bookmark },
];

export default function BottomNav() {
  const user = useAuthStore((s) => s.user);
  const items = [
    ...NAV,
    { to: user ? `/profile/${user.id}` : '/login', label: user ? 'You' : 'Sign in', icon: UserIcon },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 backdrop-blur-md pb-safe md:hidden"
      aria-label="Main navigation"
    >
      <ul className="flex h-(--spacing-bottomnav) items-stretch">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className="relative flex h-full min-h-11 flex-col items-center justify-center gap-1"
            >
              {({ isActive }) => (
                <>
                  {/* The active marker is a shared element, so it slides across
                      the bar between tabs instead of blinking on and off. */}
                  {isActive && (
                    <motion.span
                      layoutId="bottomnav-active"
                      className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-accent"
                      transition={settle}
                      aria-hidden
                    />
                  )}
                  <motion.span
                    animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.1 : 1 }}
                    whileTap={{ scale: 0.85 }}
                    transition={snap}
                    className={isActive ? 'text-accent' : 'text-muted'}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden />
                  </motion.span>
                  <span
                    className={`text-[11px] leading-none ${
                      isActive ? 'font-semibold text-accent' : 'text-muted'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
