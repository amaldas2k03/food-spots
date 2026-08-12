import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import * as listsApi from '../api/lists.js';
import ListCard from '../components/ListCard.jsx';
import { Spinner, ErrorState, EmptyState, SectionHeading } from '../components/Feedback.jsx';
import { useAuthStore } from '../store/authStore.js';

function CreateListDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', isPublic: true });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onCreated(await listsApi.createList(form));
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create a list"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Create a list</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              required
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Best late-night food"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            Public — anyone can see this list
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create list (+5 points)'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Lists() {
  const user = useAuthStore((s) => s.user);
  const [lists, setLists] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listsApi
      .getLists()
      .then((l) => {
        setLists(l);
        setState({ loading: false, error: null });
      })
      .catch((err) => setState({ loading: false, error: err }));
  }, []);

  return (
    <div>
      <SectionHeading
        title="Curated Lists"
        subtitle="Collections of spots worth keeping together"
        action={
          user && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            >
              <Plus size={15} /> Create list
            </button>
          )
        }
      />

      {state.loading ? (
        <Spinner />
      ) : state.error ? (
        <ErrorState error={state.error} onRetry={() => window.location.reload()} />
      ) : lists.length === 0 ? (
        <EmptyState
          title="No lists yet"
          hint={user ? 'Create one and start adding spots from any spot page.' : 'Sign in to create your own.'}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      {creating && (
        <CreateListDialog
          onClose={() => setCreating(false)}
          onCreated={(list) => setLists((ls) => [list, ...ls])}
        />
      )}
    </div>
  );
}
