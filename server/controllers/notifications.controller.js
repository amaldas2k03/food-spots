import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/asyncHandler.js';

export async function listNotifications(req, res) {
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: req.user.id, read: false } }),
  ]);

  res.json({ notifications, unread });
}

export async function markRead(req, res) {
  // Scope the update to the caller so one user can't mark another's notifications.
  const result = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { read: true },
  });
  if (!result.count) throw new HttpError(404, 'Notification not found');

  res.json({ ok: true });
}

export async function markAllRead(req, res) {
  const { count } = await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data: { read: true },
  });
  res.json({ ok: true, count });
}
