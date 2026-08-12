import { Router } from 'express';
import * as ctrl from '../controllers/notifications.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(ctrl.listNotifications));
router.patch('/read-all', requireAuth, asyncHandler(ctrl.markAllRead));
router.patch('/:id/read', requireAuth, asyncHandler(ctrl.markRead));

export default router;
