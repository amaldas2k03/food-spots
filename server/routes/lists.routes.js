import { Router } from 'express';
import * as ctrl from '../controllers/lists.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, asyncHandler(ctrl.listLists));
router.post('/', requireAuth, asyncHandler(ctrl.createList));
router.get('/:id', optionalAuth, asyncHandler(ctrl.getList));
router.post('/:id/spots', requireAuth, asyncHandler(ctrl.addSpotToList));
router.delete('/:id/spots/:spotId', requireAuth, asyncHandler(ctrl.removeSpotFromList));

export default router;
