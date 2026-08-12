import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Trash2 } from 'lucide-react';
import * as listsApi from '../api/lists.js';
import SpotCard from '../components/SpotCard.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { useAuthStore } from '../store/authStore.js';

export default function ListDetail() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const [list, setList] = useState(null);
  const [state, setState] = useState({ loading: true, error: null });

  useEffect(() => {
    listsApi
      .getList(id)
      .then((l) => {
        setList(l);
        setState({ loading: false, error: null });
      })
      .catch((err) => setState({ loading: false, error: err }));
  }, [id]);

  async function remove(spotId) {
    setList((l) => ({ ...l, spots: l.spots.filter((s) => s.id !== spotId) }));
    await listsApi.removeSpotFromList(id, spotId).catch(() => window.location.reload());
  }

  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} />;
  if (!list) return null;

  const isOwner = user?.id === list.userId;

  return (
    <div>
      <Link to="/lists" className="text-sm text-accent hover:underline">
        ← All lists
      </Link>

      <header className="mt-2">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">{list.title}</h1>
          {!list.isPublic && <Lock size={15} className="text-muted" />}
        </div>
        {list.description && <p className="mt-1 text-sm text-muted">{list.description}</p>}
        <p className="mt-1 text-xs text-muted">
          {list.spots.length} spot{list.spots.length === 1 ? '' : 's'}
          {list.user && (
            <>
              {' · by '}
              <Link to={`/profile/${list.user.id}`} className="hover:text-accent">
                {list.user.name}
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="mt-6">
        {list.spots.length === 0 ? (
          <EmptyState
            title="This list is empty"
            hint={isOwner ? 'Open any spot and use "Save to list" to add it here.' : undefined}
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {list.spots.map((spot) => (
              <div key={spot.id} className="relative">
                <SpotCard spot={spot} />
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => remove(spot.id)}
                    aria-label={`Remove ${spot.name} from this list`}
                    className="absolute top-2 right-2 rounded-lg bg-surface/90 p-1.5 text-muted shadow-sm hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
