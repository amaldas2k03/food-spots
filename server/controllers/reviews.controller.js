import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/asyncHandler.js';
import { uploadReviewFiles } from '../services/cloudinary.service.js';
import { notify, recordActivity } from '../services/notifications.service.js';
import { POINTS, recomputeBadges } from '../utils/points.js';

const REVIEW_AUTHOR = { select: { id: true, name: true, avatarUrl: true, badges: true } };

export async function listReviews(req, res) {
  const { sort = 'newest' } = req.query;
  const orderBy = sort === 'helpful' ? { helpfulCount: 'desc' } : { createdAt: 'desc' };

  const reviews = await prisma.review.findMany({
    where: { spotId: req.params.id },
    orderBy,
    include: {
      user: REVIEW_AUTHOR,
      ownerResponse: true,
      dishRatings: { include: { dish: { select: { id: true, name: true } } } },
      // Surface the caller's own vote so the UI can show its active state.
      votes: req.user ? { where: { userId: req.user.id }, select: { helpful: true } } : false,
    },
  });

  res.json({
    reviews: reviews.map(({ votes, ...r }) => ({ ...r, myVote: votes?.[0]?.helpful ?? null })),
  });
}

const createReviewSchema = z.object({
  overallRating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(1, 'Review text is required'),
  // Sent as JSON string when the request is multipart/form-data.
  dishRatings: z
    .preprocess(
      (v) => (typeof v === 'string' ? JSON.parse(v) : v),
      z.array(z.object({ dishId: z.string(), rating: z.number().int().min(1).max(5) })),
    )
    .default([]),
});

/**
 * POST /api/spots/:id/reviews
 * locationVerify has already set req.verifiedVisit from the submitted coords.
 */
export async function createReview(req, res) {
  const spotId = req.params.id;
  const { overallRating, text, dishRatings } = createReviewSchema.parse(req.body);

  const existing = await prisma.review.findUnique({
    where: { userId_spotId: { userId: req.user.id, spotId } },
  });
  if (existing) throw new HttpError(409, 'You have already reviewed this spot');

  // Reject dish ratings that belong to a different spot before uploading media.
  if (dishRatings.length) {
    const valid = await prisma.dish.count({
      where: { spotId, id: { in: dishRatings.map((d) => d.dishId) } },
    });
    if (valid !== dishRatings.length) {
      throw new HttpError(400, 'One or more dishes do not belong to this spot');
    }
  }

  const { photos, videoUrl } = await uploadReviewFiles(req.files);

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        userId: req.user.id,
        spotId,
        overallRating,
        text,
        photos,
        videoUrl,
        verifiedVisit: req.verifiedVisit,
        dishRatings: { create: dishRatings.map((d) => ({ dishId: d.dishId, rating: d.rating })) },
      },
      include: { user: REVIEW_AUTHOR, dishRatings: true },
    });

    await refreshSpotRating(spotId, tx);
    await Promise.all(dishRatings.map((d) => refreshDishRating(d.dishId, tx)));

    // review_submitted = 1, verified_review = 2 (the spec's +1 bonus on top).
    const points = POINTS.REVIEW_SUBMITTED + (req.verifiedVisit ? POINTS.VERIFIED_REVIEW - POINTS.REVIEW_SUBMITTED : 0);
    await tx.user.update({ where: { id: req.user.id }, data: { points: { increment: points } } });

    await recordActivity(req.user.id, 'review_created', { spotId, reviewId: created.id }, tx);
    return created;
  });

  await recomputeBadges(req.user.id);

  // Tell the owner someone reviewed their spot.
  const spot = await prisma.spot.findUnique({ where: { id: spotId }, select: { ownerUserId: true, name: true } });
  if (spot?.ownerUserId && spot.ownerUserId !== req.user.id) {
    await notify(spot.ownerUserId, 'review_on_your_spot', {
      spotId,
      spotName: spot.name,
      reviewId: review.id,
      fromUser: req.user.name,
    });
  }

  res.status(201).json({ review, verifiedVisit: req.verifiedVisit, distanceFromSpot: req.distanceFromSpot });
}

/** Shared by POST /helpful and /not-helpful. Idempotent: re-voting the same way is a no-op. */
export async function voteReview(req, res) {
  const helpful = req.path.endsWith('/helpful');
  const reviewId = req.params.id;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true },
  });
  if (!review) throw new HttpError(404, 'Review not found');
  if (review.userId === req.user.id) throw new HttpError(400, 'You cannot vote on your own review');

  const previous = await prisma.reviewVote.findUnique({
    where: { reviewId_userId: { reviewId, userId: req.user.id } },
  });
  if (previous?.helpful === helpful) {
    return res.json({ ok: true, unchanged: true });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.reviewVote.upsert({
      where: { reviewId_userId: { reviewId, userId: req.user.id } },
      create: { reviewId, userId: req.user.id, helpful },
      update: { helpful },
    });

    // Switching sides removes the old vote's count as well as adding the new one.
    const delta = { helpfulCount: 0, notHelpfulCount: 0 };
    if (helpful) delta.helpfulCount += 1;
    else delta.notHelpfulCount += 1;
    if (previous?.helpful === true) delta.helpfulCount -= 1;
    if (previous?.helpful === false) delta.notHelpfulCount -= 1;

    const result = await tx.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount: { increment: delta.helpfulCount },
        notHelpfulCount: { increment: delta.notHelpfulCount },
      },
      select: { helpfulCount: true, notHelpfulCount: true },
    });

    // Author earns a point only for a newly received helpful vote.
    if (helpful && !previous) {
      await tx.user.update({
        where: { id: review.userId },
        data: { points: { increment: POINTS.HELPFUL_VOTE_RECEIVED } },
      });
    }
    return result;
  });

  if (helpful && !previous) {
    await recomputeBadges(review.userId);
    await notify(review.userId, 'review_helpful', { reviewId, fromUser: req.user.name });
  }

  res.json({ ok: true, ...updated, myVote: helpful });
}

export async function ownerResponse(req, res) {
  const { text } = z.object({ text: z.string().trim().min(1) }).parse(req.body);

  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    include: { spot: { select: { ownerUserId: true, name: true, id: true } } },
  });
  if (!review) throw new HttpError(404, 'Review not found');
  if (review.spot.ownerUserId !== req.user.id) {
    throw new HttpError(403, 'Only the spot owner can respond to this review');
  }

  const response = await prisma.ownerResponse.upsert({
    where: { reviewId: review.id },
    create: { reviewId: review.id, text },
    update: { text },
  });

  await notify(review.userId, 'owner_responded', {
    reviewId: review.id,
    spotId: review.spot.id,
    spotName: review.spot.name,
  });

  res.status(201).json({ ownerResponse: response });
}

/** Recomputes the denormalised rating/count on a spot. */
async function refreshSpotRating(spotId, tx) {
  const agg = await tx.review.aggregate({
    where: { spotId },
    _avg: { overallRating: true },
    _count: true,
  });
  await tx.spot.update({
    where: { id: spotId },
    data: {
      overallRating: Number((agg._avg.overallRating ?? 0).toFixed(2)),
      reviewCount: agg._count,
    },
  });
}

async function refreshDishRating(dishId, tx) {
  const agg = await tx.dishRating.aggregate({ where: { dishId }, _avg: { rating: true } });
  await tx.dish.update({
    where: { id: dishId },
    data: { avgRating: Number((agg._avg.rating ?? 0).toFixed(2)) },
  });
}
