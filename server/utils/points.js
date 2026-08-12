import { prisma } from './prisma.js';

// Values come straight from the spec's points_system.
export const POINTS = {
  REVIEW_SUBMITTED: 1,
  VERIFIED_REVIEW: 2,
  HELPFUL_VOTE_RECEIVED: 1,
  LIST_CREATED: 5,
  CRAWL_CREATED: 3,
};

export async function awardPoints(userId, amount, tx = prisma) {
  if (!amount) return;
  await tx.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
  });
}

// Badge thresholds are evaluated after every point change; badges[] is a set.
const BADGE_RULES = [
  { badge: 'First Bite', test: (s) => s.reviewCount >= 1 },
  { badge: 'Regular', test: (s) => s.reviewCount >= 10 },
  { badge: 'Critic', test: (s) => s.reviewCount >= 50 },
  { badge: 'Verified Explorer', test: (s) => s.verifiedCount >= 5 },
  { badge: 'Ground Truth', test: (s) => s.verifiedCount >= 25 },
  { badge: 'Curator', test: (s) => s.listCount >= 3 },
  { badge: 'Trailblazer', test: (s) => s.crawlCount >= 3 },
  { badge: 'Local Legend', test: (s) => s.points >= 100 },
];

export async function recomputeBadges(userId, tx = prisma) {
  const [user, reviewCount, verifiedCount, listCount, crawlCount] = await Promise.all([
    tx.user.findUnique({ where: { id: userId }, select: { points: true, badges: true } }),
    tx.review.count({ where: { userId } }),
    tx.review.count({ where: { userId, verifiedVisit: true } }),
    tx.curatedList.count({ where: { userId } }),
    tx.foodCrawl.count({ where: { userId } }),
  ]);
  if (!user) return [];

  const stats = { points: user.points, reviewCount, verifiedCount, listCount, crawlCount };
  const earned = BADGE_RULES.filter((r) => r.test(stats)).map((r) => r.badge);
  const merged = [...new Set([...user.badges, ...earned])];

  if (merged.length !== user.badges.length) {
    await tx.user.update({ where: { id: userId }, data: { badges: merged } });
  }
  return merged;
}
