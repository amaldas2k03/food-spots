import { Router } from 'express';
import * as ctrl from '../controllers/reviews.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/:id/helpful', requireAuth, asyncHandler(ctrl.voteReview));
router.post('/:id/not-helpful', requireAuth, asyncHandler(ctrl.voteReview));
router.post('/:id/owner-response', requireAuth, asyncHandler(ctrl.ownerResponse));

export default router;
