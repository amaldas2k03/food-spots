import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as spotsApi from '../api/spots.js';
import SpotForm, { spotToFormValues } from '../components/SpotForm.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { useAuthStore } from '../store/authStore.js';
import { canEditSpot } from '../utils/permissions.js';

export default function EditSpot() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [spot, setSpot] = useState(null);
  const [state, setState] = useState({ loading: true, error: null });

  const load = useCallback(() => {
    setState({ loading: true, error: null });
    spotsApi
      .getSpot(id)
      .then((s) => {
        setSpot(s);
        setState({ loading: false, error: null });
      })
      .catch((err) => setState({ loading: false, error: err }));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} onRetry={load} />;

  if (!canEditSpot(spot, user)) {
    return (
      <EmptyState
        title="You can't edit this spot"
        hint="Only the owner, or whoever added it while it was unclaimed, can make changes."
        action={
          <Link to={`/spots/${id}`} className="mt-2 text-sm text-accent hover:underline">
            Back to {spot.name}
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/spots/${id}`} className="text-sm text-accent hover:underline">
        ← Back to {spot.name}
      </Link>

      <h1 className="mt-2 font-display text-xl font-bold">Edit spot</h1>
      <p className="text-sm text-muted">
        Fix a typo, move the pin, or update the details. Reviews and dishes stay put.
      </p>

      <SpotForm
        initial={spotToFormValues(spot, user.id)}
        submitLabel="Save changes"
        busyLabel="Saving…"
        onSubmit={async (values) => {
          await spotsApi.updateSpot(id, values);
          navigate(`/spots/${id}`);
        }}
        footer={
          <Link
            to={`/spots/${id}`}
            className="rounded-lg border border-line px-4 py-3 text-sm hover:border-accent"
          >
            Cancel
          </Link>
        }
      />
    </div>
  );
}
