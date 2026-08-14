import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Heart, Library, Compass } from 'lucide-react';
import * as listsApi from '../api/lists.js';
import ListCard from '../components/ListCard.jsx';
import SpotCard from '../components/SpotCard.jsx';
import { ErrorState, EmptyState } from '../components/Feedback.jsx';
import {
  Button,
  Drawer,
  Reveal,
  RevealItem,
  SpotGridSkeleton,
  Skeleton,
} from '../components/ui/index.js';
import { useAuthStore } from '../store/authStore.js';
import { useSavedStore } from '../store/savedStore.js';
import { settle, snap } from '../motion/index.js';

/** Create-a-list form, in the app's standard drawer instead of a bespoke modal. */
function CreateListDrawer({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', isPublic: true });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onCreated(await listsApi.createList(form));
      setForm({ title: '', description: '', isPublic: true });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field =
    'w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm focus:border-accent focus:outline-none';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Start a list"
      description="A place to keep spots that belong together"
    >
      <form onSubmit={submit} className="space-y-4" id="create-list-form">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
            What’s it called?
          </label>
          <input
            id="title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Best late-night food"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="For when it's 1am and nothing else is open."
            className={field}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-surface p-3.5 text-sm">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
          />
          <span>
            <span className="font-medium">Make it public</span>
            <span className="mt-0.5 block text-xs text-muted">
              Anyone can see it, and it can show up on other people’s feeds.
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy || !form.title.trim()} block size="lg">
          {busy ? 'Creating…' : 'Create list (+5 points)'}
        </Button>
      </form>
    </Drawer>
  );
}

const TABS = [
  { id: 'saved', label: 'Saved by you', icon: Heart },
  { id: 'lists', label: 'Curated lists', icon: Library },
];

export default function Lists() {
  const user = useAuthStore((s) => s.user);
  const savedSpots = useSavedStore((s) => s.spots);
  const savedReady = useSavedStore((s) => s.ready);
  const initSaved = useSavedStore((s) => s.init);

  const [lists, setLists] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState(user ? 'saved' : 'lists');

  useEffect(() => {
    if (user) initSaved();
  }, [user, initSaved]);

  useEffect(() => {
    listsApi
      .getLists()
      .then((l) => {
        setLists(l);
        setState({ loading: false, error: null });
      })
      .catch((err) => setState({ loading: false, error: err }));
  }, []);

  if (state.error) {
    return <ErrorState error={state.error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div>
      <header className="mb-6 border-b border-line pb-6">
        <p className="label-caps mb-3 text-ember">Your collection</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[length:var(--text-section)] font-black">
              Everything you’ve kept
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-muted">
              Hearts go straight to your saved spots. Lists are for grouping them into something
              you’d actually send to a friend.
            </p>
          </div>
          {user && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              New list
            </Button>
          )}
        </div>
      </header>

      {/* Tabs with a sliding shared-element indicator. */}
      <nav className="mb-6 flex gap-1 border-b border-line" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count = id === 'saved' ? savedSpots.length : lists.length;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`relative flex min-h-11 cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === id ? 'text-accent-dark' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={15} aria-hidden />
              {label}
              {(savedReady || id === 'lists') && !state.loading && (
                <span className="text-xs opacity-70">({count})</span>
              )}
              {tab === id && (
                <motion.span
                  layoutId="lists-tab"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                  transition={settle}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          id={`panel-${tab}`}
          role="tabpanel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'saved' ? (
            !user ? (
              <EmptyState
                title="Nothing saved yet — you’re not signed in"
                hint="Sign in and the heart on any spot keeps it here for you."
                action={<Button to="/login">Sign in</Button>}
              />
            ) : !savedReady ? (
              <SpotGridSkeleton count={3} />
            ) : savedSpots.length === 0 ? (
              <EmptyState
                title="No saved spots yet"
                hint="Tap the heart on anything that looks good. It’ll be waiting here — and yes, it steams."
                action={
                  <Button to="/search" icon={Compass}>
                    Go find something
                  </Button>
                }
              />
            ) : (
              /*
               * `layout` on both the grid and the items: un-saving a spot from
               * this view removes its card and the rest glide into the gap
               * rather than jumping. That continuity is what makes a destructive
               * action feel safe enough to use casually.
               */
              <motion.div
                layout
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                <AnimatePresence mode="popLayout">
                  {savedSpots.map((spot) => (
                    <motion.div
                      key={spot.id}
                      layout
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={snap}
                    >
                      <SpotCard spot={spot} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )
          ) : state.loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 w-full" rounded="rounded-card" />
              ))}
            </div>
          ) : lists.length === 0 ? (
            <EmptyState
              title="No lists yet"
              hint={
                user
                  ? '“Cheap and excellent”, “Worth the drive”, “Where to take my parents” — that sort of thing.'
                  : 'Sign in to build your own.'
              }
              action={
                user ? (
                  <Button icon={Plus} onClick={() => setCreating(true)}>
                    Start a list
                  </Button>
                ) : (
                  <Button to="/login">Sign in</Button>
                )
              }
            />
          ) : (
            <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
              {lists.map((list) => (
                <RevealItem key={list.id}>
                  <ListCard list={list} />
                </RevealItem>
              ))}
            </Reveal>
          )}
        </motion.div>
      </AnimatePresence>

      <CreateListDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(list) => setLists((ls) => [list, ...ls])}
      />
    </div>
  );
}
