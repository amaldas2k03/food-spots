import multer from 'multer';
import { HttpError } from '../utils/asyncHandler.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

// Files are held in memory and streamed straight to Cloudinary, so nothing
// touches disk. Limits are per-file.
const storage = multer.memoryStorage();

export const uploadReviewMedia = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB — a 60s phone video can be large
    files: 11, // 10 photos + 1 video
  },
  fileFilter(req, file, cb) {
    const allowed = file.fieldname === 'video' ? VIDEO_TYPES : IMAGE_TYPES;
    if (!allowed.includes(file.mimetype)) {
      return cb(new HttpError(400, `Unsupported file type for ${file.fieldname}: ${file.mimetype}`));
    }
    cb(null, true);
  },
}).fields([
  { name: 'photos', maxCount: 10 },
  { name: 'video', maxCount: 1 },
]);
