import { prisma } from '../utils/prisma.js';
import { haversineMeters } from '../utils/geo.js';
import { HttpError } from '../utils/asyncHandler.js';

export const VERIFIED_RADIUS_M = 100;

/**
 * Compares the coords submitted with a review against the spot's location and
 * sets req.verifiedVisit. Missing or unparseable coords mean "not verified"
 * rather than an error — reviewing from home is allowed, it just isn't verified.
 */
export async function locationVerify(req, res, next) {
  try {
    const spot = await prisma.spot.findUnique({
      where: { id: req.params.id },
      select: { lat: true, lng: true },
    });
    if (!spot) throw new HttpError(404, 'Spot not found');

    const lat = Number.parseFloat(req.body.lat);
    const lng = Number.parseFloat(req.body.lng);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const distance = haversineMeters(lat, lng, spot.lat, spot.lng);
      req.verifiedVisit = distance < VERIFIED_RADIUS_M;
      req.distanceFromSpot = Math.round(distance);
    } else {
      req.verifiedVisit = false;
      req.distanceFromSpot = null;
    }
    next();
  } catch (err) {
    next(err);
  }
}
