import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Search, LogOut, User as UserIcon, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import Avatar from './Avatar.jsx';
import NotificationDropdown from './NotificationDropdown.jsx';
import { Button, IconButton } from './ui/index.js';
import { snap, settle, scaleIn } from '../motion/index.js';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const menuRef = useRef(null);
  const mobileInputRef = useRef(null);

  /*
   * The bar starts flush against the cream page and gains a surface, a border
   * and a shadow once you scroll — so the header only asserts itself when
   * there's content passing underneath it. Reading the scroll via a motion
   * value keeps this off React's render path until the boolean actually flips.
   */
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => setLifted(y > 12));

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) mobileInputRef.current?.focus();
  }, [searchOpen]);

  function submitSearch(e) {
    e.preventDefault();
    setSearchOpen(false);
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  }

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40 h-(--spacing-navbar)"
      animate={{
        backgroundColor: lifted ? 'rgba(255,255,255,0.88)' : 'rgba(253,248,241,0)',
        boxShadow: lifted ? '0 1px 0 var(--color-line), var(--shadow-card)' : '0 0 0 rgba(0,0,0,0)',
      }}
      transition={{ duration: 0.25 }}
      style={{ backdropFilter: lifted ? 'blur(12px)' : 'none' }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex min-h-11 shrink-0 items-center font-display text-xl font-bold tracking-tight md:w-(--spacing-sidebar)"
        >
          Food<span className="text-accent">Spots</span>
        </Link>

        {/* Desktop: the search field is always present. */}
        <form onSubmit={submitSearch} className="hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search spots and dishes…"
              aria-label="Search spots and dishes"
              className="w-full rounded-chip border border-line bg-surface py-2.5 pr-4 pl-10 text-sm transition-colors placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          {/* Mobile: search is an icon that expands into a full-width field,
              rather than a permanently shrunken input competing for the row. */}
          <IconButton
            icon={Search}
            label="Search"
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
          />

          {user ? (
            <>
              <NotificationDropdown />

              <div className="relative" ref={menuRef}>
                <motion.button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-accent-soft"
                  whileTap={{ scale: 0.92 }}
                  transition={snap}
                >
                  <Avatar user={user} size={32} />
                </motion.button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      role="menu"
                      className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-card bg-surface py-1 shadow-[var(--shadow-lift)]"
                      variants={scaleIn}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      style={{ originX: 1, originY: 0 }}
                    >
                      <div className="border-b border-line px-4 py-3">
                        <p className="truncate font-display text-base font-semibold">{user.name}</p>
                        <p className="text-xs text-muted">{user.points ?? 0} points earned</p>
                      </div>

                      <Link
                        to={`/profile/${user.id}`}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-accent-soft"
                      >
                        <UserIcon size={15} aria-hidden /> My profile
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                          navigate('/login');
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left text-sm hover:bg-accent-soft"
                      >
                        <LogOut size={15} aria-hidden /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button to="/register" variant="primary" size="sm">
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="absolute inset-x-0 top-0 flex h-(--spacing-navbar) items-center gap-2 bg-surface px-4 shadow-[var(--shadow-card)] md:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={settle}
          >
            <form onSubmit={submitSearch} className="flex-1">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  ref={mobileInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search spots and dishes…"
                  aria-label="Search spots and dishes"
                  className="w-full rounded-chip border border-line bg-bg py-2.5 pr-4 pl-10 text-sm focus:border-accent focus:outline-none"
                />
              </div>
            </form>
            <IconButton icon={X} label="Close search" size={40} onClick={() => setSearchOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
