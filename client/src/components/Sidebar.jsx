import { NavLink } from 'react-router-dom';
import { Home, Map, Search, Route, Bookmark, Users, Trophy } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/crawl', label: 'Crawl', icon: Route },
  { to: '/lists', label: 'Lists', icon: Bookmark },
  { to: '/social', label: 'Social', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export default function Sidebar() {
  return (
    <aside
      className="fixed top-(--spacing-navbar) bottom-0 left-0 w-(--spacing-sidebar) border-r border-line bg-surface"
      aria-label="Main navigation"
    >
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-accent-soft font-medium text-accent'
                  : 'text-ink hover:bg-bg'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
