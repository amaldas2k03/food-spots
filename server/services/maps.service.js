import { HttpError } from '../utils/asyncHandler.js';

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

/**
 * Routes an ordered list of spots via the Google Directions API.
 * Ordering is taken as given — the crawl planner lets the user drag stops,
 * so we do not pass optimize:true.
 *
 * @param {{lat:number,lng:number}[]} stops - at least two, in visit order
 * @returns {{totalDistance:number,totalEta:number,polyline:string|null,legs:object[]}}
 */
export async function getCrawlRoute(stops, mode = 'driving') {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new HttpError(503, 'Routing is not configured: GOOGLE_MAPS_SERVER_KEY is unset');
  if (stops.length < 2) throw new HttpError(400, 'A crawl route needs at least two stops');

  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    key,
  });
  if (waypoints.length) {
    params.set('waypoints', waypoints.map((s) => `${s.lat},${s.lng}`).join('|'));
  }

  const res = await fetch(`${DIRECTIONS_URL}?${params}`);
  if (!res.ok) throw new HttpError(502, `Directions API returned HTTP ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK') {
    throw new HttpError(502, `Directions API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`);
  }

  const route = data.routes[0];
  const legs = route.legs.map((leg) => ({
    distance: leg.distance.value,
    duration: leg.duration.value,
    startAddress: leg.start_address,
    endAddress: leg.end_address,
  }));

  return {
    totalDistance: legs.reduce((sum, l) => sum + l.distance, 0),
    totalEta: legs.reduce((sum, l) => sum + l.duration, 0),
    polyline: route.overview_polyline?.points ?? null,
    legs,
  };
}
