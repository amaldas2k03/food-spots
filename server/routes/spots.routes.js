import { Router } from 'express';
import * as spots from '../controllers/spots.controller.js';
import * as dishes from '../controllers/dishes.controller.js';
import * as reviews from '../controllers/reviews.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { uploadReviewMedia } from '../middleware/upload.js';
import { locationVerify } from '../middleware/locationVerify.js';

const router = Router();

// Static segments must be declared before /:id or they'd be captured as ids.
router.get('/trending', asyncHandler(spots.trendingSpots));
router.get('/hidden-gems', asyncHandler(spots.hiddenGems));

router.get('/', asyncHandler(spots.listSpots));
router.post('/', requireAuth, asyncHandler(spots.createSpot));
router.get('/:id', asyncHandler(spots.getSpot));
router.patch('/:id', requireAuth, asyncHandler(spots.updateSpot));
router.delete('/:id', requireAuth, asyncHandler(spots.deleteSpot));

router.get('/:id/dishes', asyncHandler(dishes.listDishes));
router.post('/:id/dishes', requireAuth, asyncHandler(dishes.createDish));

router.get('/:id/reviews', optionalAuth, asyncHandler(reviews.listReviews));
router.post(
  '/:id/reviews',
  requireAuth,
  uploadReviewMedia, // parses multipart so req.body.lat/lng exist for locationVerify
  locationVerify,
  asyncHandler(reviews.createReview),
);

export default router;
