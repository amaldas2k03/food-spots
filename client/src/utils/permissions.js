/**
 * Mirrors `assertSpotEditor` in server/controllers/spots.controller.js: the
 * claimed owner, or the person who added a spot nobody has claimed. The server
 * is still the authority — this only decides whether to show the controls.
 */
export function canEditSpot(spot, user) {
  if (!spot || !user) return false;
  if (spot.ownerUserId) return spot.ownerUserId === user.id;
  return Boolean(spot.createdByUserId) && spot.createdByUserId === user.id;
}
