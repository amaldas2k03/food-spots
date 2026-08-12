import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/asyncHandler.js';
import { notify } from '../services/notifications.service.js';

const FEED_AUTHOR = { select: { id: true, name: true, avatarUrl: true } };

export async function followUser(req, res) {
  const targetId = req.params.id;
  if (targetId === req.user.id) throw new HttpError(400, 'You cannot follow yourself');

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw new HttpError(404, 'User not found');

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.user.id, followingId: targetId } },
  });

  if (!existing) {
    await prisma.follow.create({ data: { followerId: req.user.id, followingId: targetId } });
    await notify(targetId, 'new_follower', { userId: req.user.id, name: req.user.name });
  }

  res.status(201).json({ ok: true, following: true });
}

export async function unfollowUser(req, res) {
  await prisma.follow
    .delete({
      where: { followerId_followingId: { followerId: req.user.id, followingId: req.params.id } },
    })
    // Unfollowing someone you don't follow is not an error.
    .catch((err) => {
      if (err.code !== 'P2025') throw err;
    });

  res.json({ ok: true, following: false });
}

/** Activity from the people the caller follows, newest first. */
export async function getFeed(req, res) {
  const take = Math.min(Number(req.query.take) || 30, 100);

  const following = await prisma.follow.findMany({
    where: { followerId: req.user.id },
    select: { followingId: true },
  });
  const authorIds = following.map((f) => f.followingId);
  if (!authorIds.length) return res.json({ activities: [], empty: true });

  const activities = await prisma.activity.findMany({
    where: { userId: { in: authorIds } },
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: FEED_AUTHOR },
  });

  // Payloads hold ids; hydrate the spots so cards can render without N+1 calls.
  const spotIds = [...new Set(activities.map((a) => a.payload?.spotId).filter(Boolean))];
  const spots = await prisma.spot.findMany({ where: { id: { in: spotIds } } });
  const spotMap = Object.fromEntries(spots.map((s) => [s.id, s]));

  res.json({
    activities: activities.map((a) => ({
      ...a,
      spot: a.payload?.spotId ? spotMap[a.payload.spotId] ?? null : null,
    })),
  });
}

/** Users the caller doesn't follow yet, ranked by points. */
export async function getSuggestedUsers(req, res) {
  const following = await prisma.follow.findMany({
    where: { followerId: req.user.id },
    select: { followingId: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { notIn: [...following.map((f) => f.followingId), req.user.id] } },
    orderBy: { points: 'desc' },
    take: 8,
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      points: true,
      badges: true,
      _count: { select: { reviews: true } },
    },
  });

  res.json({ users });
}

export async function getLeaderboard(req, res) {
  const take = Math.min(Number(req.query.take) || 50, 100);

  const users = await prisma.user.findMany({
    orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
    take,
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      points: true,
      badges: true,
      _count: { select: { reviews: true } },
    },
  });

  // Verified counts need a separate grouped query — Prisma can't filter _count inline.
  const verified = await prisma.review.groupBy({
    by: ['userId'],
    where: { userId: { in: users.map((u) => u.id) }, verifiedVisit: true },
    _count: { userId: true },
  });
  const verifiedMap = Object.fromEntries(verified.map((v) => [v.userId, v._count.userId]));

  res.json({
    leaderboard: users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      points: u.points,
      badges: u.badges,
      reviewCount: u._count.reviews,
      verifiedCount: verifiedMap[u.id] ?? 0,
    })),
  });
}

export async function getProfile(req, res) {
  const id = req.params.id;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      tasteProfile: true,
      points: true,
      badges: true,
      createdAt: true,
      _count: { select: { reviews: true, followers: true, following: true } },
    },
  });
  if (!user) throw new HttpError(404, 'User not found');

  const [reviews, lists, crawls, isFollowing] = await Promise.all([
    prisma.review.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      include: { spot: { select: { id: true, name: true, photos: true, cuisineType: true } } },
    }),
    prisma.curatedList.findMany({
      where: { userId: id, ...(req.user?.id === id ? {} : { isPublic: true }) },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { spots: true } } },
    }),
    prisma.foodCrawl.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      include: { stops: { include: { spot: { select: { id: true, name: true } } }, orderBy: { position: 'asc' } } },
    }),
    req.user
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.user.id, followingId: id } },
        })
      : null,
  ]);

  res.json({
    user,
    reviews,
    lists: lists.map((l) => ({ ...l, spotCount: l._count.spots })),
    crawls: crawls.map((c) => ({ ...c, stops: c.stops.map((s) => s.spot) })),
    isFollowing: Boolean(isFollowing),
  });
}
