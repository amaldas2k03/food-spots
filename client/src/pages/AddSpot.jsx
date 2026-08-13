import { Link, useNavigate } from 'react-router-dom';
import * as spotsApi from '../api/spots.js';
import SpotForm, { BLANK_SPOT } from '../components/SpotForm.jsx';

export default function AddSpot() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/map" className="text-sm text-accent hover:underline">
        ← Back to the map
      </Link>

      <h1 className="mt-2 font-display text-xl font-bold">Add a spot</h1>
      <p className="text-sm text-muted">
        Somewhere worth eating that FoodSpots doesn't know about yet.
      </p>

      <SpotForm
        initial={BLANK_SPOT}
        submitLabel="Add spot"
        busyLabel="Adding…"
        onSubmit={async (values) => {
          const spot = await spotsApi.createSpot(values);
          navigate(`/spots/${spot.id}`);
        }}
      />
    </div>
  );
}
