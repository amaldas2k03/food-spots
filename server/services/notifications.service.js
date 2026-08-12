import { prisma } from '../utils/prisma.js';

let io = null;

/** Called once from index.js after the Socket.io server is created. */
export function registerSocketServer(server) {
  io = server;
}

/**
 * Persists a notification and pushes it to the user's socket room if connected.
 * Delivery is best-effort: an offline user picks it up from GET /api/notifications.
 */
export async function notify(userId, type, payload) {
  const notification = await prisma.notification.create({
    data: { userId, type, payload },
  });
  io?.to(`user:${userId}`).emit('notification', notification);
  return notification;
}

/** Records a feed activity. Feed reads come from GET /api/feed. */
export async function recordActivity(userId, type, payload, tx = prisma) {
  return tx.activity.create({ data: { userId, type, payload } });
}
