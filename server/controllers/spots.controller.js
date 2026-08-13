import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { haversineMeters, boundingBox } from '../utils/geo.js';
import { HttpError } from '../utils/asyncHandler.js';

const csv = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',') : undefined);

const listQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(100000).default(5000),
  cuisine: z.preprocess(csv, z.array(z.string()).optional()),
  dietary: z.preprocess(csv, z.array(z.string()).optional()),
  price: z.preprocess(csv, z.array(z.coerce.number().int().min(1).max(4)).optional()),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['rating', 'reviews', 'distance', 'newest']).default('rating'),
  q: z.string().trim().optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/spots — the shared query behind Search and Map view.
 * Text search covers spot names and dish names, per the spec's search_scope.
 */
export async function listSpots(req, res) {
  const p = listQuerySchema.parse(req.query);
  const where = { AND: [] };

  if (p.cuisine?.length) where.AND.push({ cuisineType: { hasSome: p.cuisine } });
  if (p.dietary?.length) where.AND.push({ dietaryTags: { hasEvery: p.dietary } });
  if (p.price?.length) where.AND.push({ priceRange: { in: p.price } });
  if (p.minRating) where.AND.push({ overallRating: { gte: p.minRating } });

  if (p.q) {
    where.AND.push({
      OR: [
        { name: { contains: p.q, mode: 'insensitive' } },
        { dishes: { some: { name: { contains: p.q, mode: 'insensitive' } } } },
      ],
    });
  }

  // Narrow by bounding box in SQL, then apply the exact circular filter in JS.
  const hasLocation = p.lat !== undefined && p.lng !== undefined;
  if (hasLocation) {
    const box = boundingBox(p.lat, p.lng, p.radius);
    where.AND.push({
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
    });
  }

  const orderBy = {
    rating: { overallRating: 'desc' },
    reviews: { reviewCount: 'desc' },
    newest: { createdAt: 'desc' },
    distance: { overallRating: 'desc' }, // re-sorted below once distances are known
  }[p.sort];

  let spots = await prisma.spot.findMany({
    where: where.AND.length ? where : undefined,
    orderBy,
    take: hasLocation ? undefined : p.take,
    include: { _count: { select: { reviews: true } } },
  });

  if (hasLocation) {
    spots = spots
      .map((s) => ({ ...s, distance: Math.round(haversineMeters(p.lat, p.lng, s.lat, s.lng)) }))
      .filter((s) => s.distance <= p.radius);

    if (p.sort === 'distance') spots.sort((a, b) => a.distance - b.distance);
    spots = spots.slice(0, p.take);
  }

  res.json({ spots, count: spots.length });
}

/** Spots with the most reviews in the last 7 days. */
export async function trendingSpots(req, res) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const grouped = await prisma.review.groupBy({
    by: ['spotId'],
    where: { createdAt: { gte: since } },
    _count: { spotId: true },
    orderBy: { _count: { spotId: 'desc' } },
    take: 12,
  });

  const spots = await prisma.spot.findMany({
    where: { id: { in: grouped.map((g) => g.spotId) } },
  });

  // Preserve the ranking from groupBy — findMany does not guarantee `in` order.
  const rank = new Map(grouped.map((g, i) => [g.spotId, { i, count: g._count.spotId }]));
  const ranked = spots
    .map((s) => ({ ...s, recentReviews: rank.get(s.id).count }))
    .sort((a, b) => rank.get(a.id).i - rank.get(b.id).i);

  res.json({ spots: ranked });
}

/** avg_rating >= 4.5 AND review_count < 20. */
export async function hiddenGems(req, res) {
  const spots = await prisma.spot.findMany({
    where: { overallRating: { gte: 4.5 }, reviewCount: { lt: 20 } },
    orderBy: [{ overallRating: 'desc' }, { reviewCount: 'asc' }],
    take: 12,
  });
  res.json({ spots });
}

const SPOT_DETAIL_INCLUDE = {
  dishes: { orderBy: { avgRating: 'desc' } },
  owner: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { reviews: true } },
};

export async function getSpot(req, res) {
  const spot = await prisma.spot.findUnique({
    where: { id: req.params.id },
    include: SPOT_DETAIL_INCLUDE,
  });
  if (!spot) throw new HttpError(404, 'Spot not found');
  res.json({ spot });
}

const createSpotSchema = z.object({
  name: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1),
  cuisineType: z.array(z.string()).default([]),
  priceRange: z.number().int().min(1).max(4),
  dietaryTags: z.array(z.string()).default([]),
  hours: z.record(z.any()).nullable().optional(), // null clears a published schedule

  photos: z.array(z.string().url()).default([]),
  claimOwnership: z.boolean().default(false),
});

export async function createSpot(req, res) {
  const { claimOwnership, ...data } = createSpotSchema.parse(req.body);
  const spot = await prisma.spot.create({
    data: {
      ...data,
      ownerUserId: claimOwnership ? req.user.id : null,
      // Recorded whether or not ownership was claimed — this is what lets the
      // person who added an unclaimed spot come back and fix it.
      createdByUserId: req.user.id,
    },
  });
  res.status(201).json({ spot });
}

// Same shape as create, every field optional: a PATCH may carry only what changed.
const updateSpotSchema = createSpotSchema.partial();

/**
 * Edit rights are the claimed owner, or — while nobody has claimed the place —
 * the user who added it. Spots with neither (the seed data) are read-only,
 * which is deliberate: without revision history, letting any signed-in account
 * rewrite any unclaimed spot gives no way to notice or undo the damage.
 */
async function assertSpotEditor(spotId, userId) {
  const spot = await prisma.spot.findUnique({
    where: { id: spotId },
    select: { id: true, name: true, ownerUserId: true, createdByUserId: true },
  });
  if (!spot) throw new HttpError(404, 'Spot not found');

  const isOwner = spot.ownerUserId !== null && spot.ownerUserId === userId;
  const isAdderOfUnclaimed = spot.ownerUserId === null && spot.createdByUserId === userId;
  if (!isOwner && !isAdderOfUnclaimed) {
    throw new HttpError(403, 'You can only edit spots you added or own');
  }
  return spot;
}

export async function updateSpot(req, res) {
  const { claimOwnership, ...data } = updateSpotSchema.parse(req.body);
  await assertSpotEditor(req.params.id, req.user.id);

  const spot = await prisma.spot.update({
    where: { id: req.params.id },
    // Omitted keys parse to undefined, which Prisma leaves untouched. Ownership
    // only moves when the caller sends the flag, and only ever to themselves.
    data: {
      ...data,
      ...(claimOwnership === undefined
        ? {}
        : { ownerUserId: claimOwnership ? req.user.id : null }),
    },
    include: SPOT_DETAIL_INCLUDE,
  });

  res.json({ spot });
}

export async function deleteSpot(req, res) {
  const spot = await assertSpotEditor(req.params.id, req.user.id);

  // Deleting a spot cascades to its reviews, dishes, list entries and crawl
  // stops, so a spot other people have written about is not the owner's to
  // remove. Counted rather than read off the denormalised reviewCount column.
  const reviewCount = await prisma.review.count({ where: { spotId: spot.id } });
  if (reviewCount > 0) {
    throw new HttpError(
      409,
      `This spot has ${reviewCount} review${reviewCount === 1 ? '' : 's'} and cannot be deleted. ` +
        'Editing it is still fine.',
    );
  }

  await prisma.spot.delete({ where: { id: spot.id } });
  res.json({ ok: true });
}
