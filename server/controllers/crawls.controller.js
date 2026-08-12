import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/asyncHandler.js';
import { getCrawlRoute } from '../services/maps.service.js';
import { POINTS, recomputeBadges } from '../utils/points.js';
import { recordActivity } from '../services/notifications.service.js';

const createCrawlSchema = z.object({
  title: z.string().trim().min(1).max(120),
  spotIds: z.array(z.string().min(1)).min(2, 'A crawl needs at least two stops'),
});

export async function createCrawl(req, res) {
  const { title, spotIds } = createCrawlSchema.parse(req.body);

  if (new Set(spotIds).size !== spotIds.length) {
    throw new HttpError(400, 'A crawl cannot visit the same spot twice');
  }

  const spots = await prisma.spot.findMany({
    where: { id: { in: spotIds } },
    select: { id: true, lat: true, lng: true },
  });
  if (spots.length !== spotIds.length) throw new HttpError(400, 'One or more spots do not exist');

  // Order the fetched rows to match the user's requested sequence.
  const byId = new Map(spots.map((s) => [s.id, s]));
  const ordered = spotIds.map((id) => byId.get(id));

  // Routing is best-effort: an unconfigured or failing Directions API still
  // saves the crawl, just without ETA/distance.
  let route = null;
  try {
    route = await getCrawlRoute(ordered);
  } catch (err) {
    console.warn('Crawl routing unavailable:', err.message);
  }

  const crawl = await prisma.foodCrawl.create({
    data: {
      userId: req.user.id,
      title,
      totalEta: route?.totalEta ?? null,
      totalDistance: route?.totalDistance ?? null,
      stops: { create: spotIds.map((spotId, position) => ({ spotId, position })) },
    },
    include: { stops: { include: { spot: true }, orderBy: { position: 'asc' } } },
  });

  await prisma.user.update({
    where: { id: req.user.id },
    data: { points: { increment: POINTS.CRAWL_CREATED } },
  });
  await recordActivity(req.user.id, 'crawl_created', { crawlId: crawl.id, title });
  await recomputeBadges(req.user.id);

  res.status(201).json({
    crawl: { ...crawl, stops: crawl.stops.map((s) => s.spot) },
    route,
  });
}

export async function getCrawl(req, res) {
  const crawl = await prisma.foodCrawl.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      stops: { include: { spot: true }, orderBy: { position: 'asc' } },
    },
  });
  if (!crawl) throw new HttpError(404, 'Crawl not found');

  res.json({ crawl: { ...crawl, stops: crawl.stops.map((s) => s.spot) } });
}

/**
 * GET /api/crawls/:id/route — recomputes the live route.
 * Kept separate from GET /:id so the map can refresh ETA without refetching the crawl.
 */
export async function getRoute(req, res) {
  const crawl = await prisma.foodCrawl.findUnique({
    where: { id: req.params.id },
    include: { stops: { include: { spot: true }, orderBy: { position: 'asc' } } },
  });
  if (!crawl) throw new HttpError(404, 'Crawl not found');

  const route = await getCrawlRoute(crawl.stops.map((s) => s.spot));

  // Persist the refreshed totals so list views stay accurate.
  await prisma.foodCrawl.update({
    where: { id: crawl.id },
    data: { totalEta: route.totalEta, totalDistance: route.totalDistance },
  });

  res.json({ route });
}

/** POST /api/crawls/preview — route arbitrary stops without saving. */
export async function previewRoute(req, res) {
  const { spotIds } = z.object({ spotIds: z.array(z.string()).min(2) }).parse(req.body);

  const spots = await prisma.spot.findMany({
    where: { id: { in: spotIds } },
    select: { id: true, lat: true, lng: true },
  });
  const byId = new Map(spots.map((s) => [s.id, s]));
  const ordered = spotIds.map((id) => byId.get(id)).filter(Boolean);
  if (ordered.length !== spotIds.length) throw new HttpError(400, 'One or more spots do not exist');

  res.json({ route: await getCrawlRoute(ordered) });
}
