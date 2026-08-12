import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', asyncHandler(ctrl.register));
router.post('/login', asyncHandler(ctrl.login));
router.post('/google', asyncHandler(ctrl.googleAuth));
router.get('/me', requireAuth, asyncHandler(ctrl.me));

export default router;
