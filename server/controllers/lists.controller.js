import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/asyncHandler.js';
import { POINTS, recomputeBadges } from '../utils/points.js';
import { recordActivity } from '../services/notifications.service.js';

const LIST_AUTHOR = { select: { id: true, name: true, avatarUrl: true } };

/** Public lists, plus all of the caller's own lists. */
export async function listLists(req, res) {
  const { userId } = req.query;

  const where = userId
    ? { userId, ...(userId === req.user?.id ? {} : { isPublic: true }) }
    : { OR: [{ isPublic: true }, ...(req.user ? [{ userId: req.user.id }] : [])] };

  const lists = await prisma.curatedList.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: LIST_AUTHOR,
      _count: { select: { spots: true } },
      // First spot's photo doubles as the cover when none is set.
      spots: { take: 1, include: { spot: { select: { photos: true } } } },
    },
  });

  res.json({
    lists: lists.map(({ spots, ...l }) => ({
      ...l,
      spotCount: l._count.spots,
      coverPhoto: l.coverPhoto ?? spots[0]?.spot.photos[0] ?? null,
    })),
  });
}

const createListSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean().default(true),
});

export async function createList(req, res) {
  const data = createListSchema.parse(req.body);

  const list = await prisma.curatedList.create({
    data: { ...data, userId: req.user.id },
    include: { user: LIST_AUTHOR, _count: { select: { spots: true } } },
  });

  await prisma.user.update({
    where: { id: req.user.id },
    data: { points: { increment: POINTS.LIST_CREATED } },
  });
  await recordActivity(req.user.id, 'list_created', { listId: list.id, title: list.title });
  await recomputeBadges(req.user.id);

  res.status(201).json({ list });
}

export async function getList(req, res) {
  const list = await prisma.curatedList.findUnique({
    where: { id: req.params.id },
    include: {
      user: LIST_AUTHOR,
      spots: { include: { spot: true }, orderBy: { addedAt: 'asc' } },
    },
  });
  if (!list) throw new HttpError(404, 'List not found');
  if (!list.isPublic && list.userId !== req.user?.id) {
    throw new HttpError(403, 'This list is private');
  }

  const { spots, ...rest } = list;
  res.json({ list: { ...rest, spots: spots.map((s) => s.spot) } });
}

async function assertListOwner(listId, userId) {
  const list = await prisma.curatedList.findUnique({
    where: { id: listId },
    select: { id: true, userId: true, title: true },
  });
  if (!list) throw new HttpError(404, 'List not found');
  if (list.userId !== userId) throw new HttpError(403, 'You do not own this list');
  return list;
}

export async function addSpotToList(req, res) {
  const { spotId } = z.object({ spotId: z.string().min(1) }).parse(req.body);
  const list = await assertListOwner(req.params.id, req.user.id);

  const spot = await prisma.spot.findUnique({ where: { id: spotId }, select: { id: true, name: true } });
  if (!spot) throw new HttpError(404, 'Spot not found');

  // Re-adding an existing spot is a no-op rather than an error.
  await prisma.listSpot.upsert({
    where: { listId_spotId: { listId: list.id, spotId } },
    create: { listId: list.id, spotId },
    update: {},
  });

  await recordActivity(req.user.id, 'spot_saved', {
    spotId,
    spotName: spot.name,
    listId: list.id,
    listTitle: list.title,
  });

  res.status(201).json({ ok: true });
}

export async function removeSpotFromList(req, res) {
  const list = await assertListOwner(req.params.id, req.user.id);
  await prisma.listSpot.delete({
    where: { listId_spotId: { listId: list.id, spotId: req.params.spotId } },
  });
  res.json({ ok: true });
}
