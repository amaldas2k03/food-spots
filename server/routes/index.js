import { Router } from 'express';
import authRoutes from './auth.routes.js';
import spotRoutes from './spots.routes.js';
import reviewRoutes from './reviews.routes.js';
import listRoutes from './lists.routes.js';
import crawlRoutes from './crawls.routes.js';
import socialRoutes from './social.routes.js';
import notificationRoutes from './notifications.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true, service: 'foodspots-api' }));

router.use('/auth', authRoutes);
// Dish and per-spot review routes are mounted inside spotRoutes to keep the
// /api/spots/:id/... prefix in one place.
router.use('/spots', spotRoutes);
router.use('/reviews', reviewRoutes);
router.use('/lists', listRoutes);
router.use('/crawls', crawlRoutes);
router.use('/notifications', notificationRoutes);
router.use('/', socialRoutes); // /users/:id/follow, /feed, /leaderboard

export default router;
