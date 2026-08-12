const EARTH_RADIUS_M = 6371000;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in metres. */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Bounding box for a radius search. Used to narrow the SQL query before the
 * exact haversine filter runs in JS — a box comparison can use the (lat, lng) index.
 */
export function boundingBox(lat, lng, radiusMeters) {
  const latDelta = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  // Longitude degrees shrink as you approach the poles.
  const lngDelta = latDelta / Math.max(Math.cos(toRad(lat)), 0.00001);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
