import { Router } from 'express';
import * as ctrl from '../controllers/crawls.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, asyncHandler(ctrl.createCrawl));
router.post('/preview', requireAuth, asyncHandler(ctrl.previewRoute));
router.get('/:id', asyncHandler(ctrl.getCrawl));
router.get('/:id/route', asyncHandler(ctrl.getRoute));

export default router;
