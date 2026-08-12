import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import Avatar from './Avatar.jsx';
import NotificationDropdown from './NotificationDropdown.jsx';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  function submitSearch(e) {
    e.preventDefault();
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-(--spacing-navbar) items-center gap-4 border-b border-line bg-surface px-4">
      <Link to="/" className="w-(--spacing-sidebar) shrink-0 font-display text-lg font-bold">
        Food<span className="text-accent">Spots</span>
      </Link>

      <form onSubmit={submitSearch} className="max-w-xl flex-1">
        <div className="relative">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spots and dishes…"
            aria-label="Search spots and dishes"
            className="w-full rounded-lg border border-line bg-bg py-2 pr-3 pl-9 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1">
        {user ? (
          <>
            <NotificationDropdown />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-bg"
              >
                <Avatar user={user} size={30} />
              </button>

              {menuOpen && (
                <div className="card absolute right-0 z-50 mt-2 w-52 py-1">
                  <div className="border-b border-line px-4 py-2.5">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted">{user.points ?? 0} points</p>
                  </div>

                  <Link
                    to={`/profile/${user.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-bg"
                  >
                    <UserIcon size={15} /> My profile
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                      navigate('/login');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-bg"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm hover:bg-bg">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
