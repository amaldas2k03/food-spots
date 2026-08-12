import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/asyncHandler.js';

export async function listDishes(req, res) {
  const dishes = await prisma.dish.findMany({
    where: { spotId: req.params.id },
    orderBy: [{ avgRating: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { ratings: true } } },
  });
  res.json({ dishes });
}

const createDishSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  photoUrl: z.string().url().optional(),
});

export async function createDish(req, res) {
  const spotId = req.params.id;
  const data = createDishSchema.parse(req.body);

  const spot = await prisma.spot.findUnique({ where: { id: spotId }, select: { id: true } });
  if (!spot) throw new HttpError(404, 'Spot not found');

  const dish = await prisma.dish.create({ data: { ...data, spotId } });
  res.status(201).json({ dish });
}
