import { Router } from 'express';
import * as ctrl from '../controllers/social.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/users/:id/follow', requireAuth, asyncHandler(ctrl.followUser));
router.delete('/users/:id/follow', requireAuth, asyncHandler(ctrl.unfollowUser));
router.get('/users/:id', optionalAuth, asyncHandler(ctrl.getProfile));

router.get('/feed', requireAuth, asyncHandler(ctrl.getFeed));
router.get('/suggested-users', requireAuth, asyncHandler(ctrl.getSuggestedUsers));
router.get('/leaderboard', asyncHandler(ctrl.getLeaderboard));

export default router;
