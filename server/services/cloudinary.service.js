import { v2 as cloudinary } from 'cloudinary';
import { HttpError } from '../utils/asyncHandler.js';

let configured = false;

function configure() {
  if (configured) return true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return false;

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
  return true;
}

export const isCloudinaryConfigured = () => configure();

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result),
    );
    stream.end(buffer);
  });
}

export async function uploadImage(file, folder = 'foodspots/reviews') {
  if (!configure()) throw new HttpError(503, 'Media uploads are not configured on this server');
  const result = await uploadBuffer(file.buffer, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
  });
  return result.secure_url;
}

export const MAX_VIDEO_SECONDS = 60;

export async function uploadVideo(file, folder = 'foodspots/reviews') {
  if (!configure()) throw new HttpError(503, 'Media uploads are not configured on this server');
  const result = await uploadBuffer(file.buffer, {
    folder,
    resource_type: 'video',
  });

  // Cloudinary reports duration after processing; reject over-long clips and
  // clean up so we don't leave an orphaned asset behind.
  if (result.duration > MAX_VIDEO_SECONDS) {
    await cloudinary.uploader
      .destroy(result.public_id, { resource_type: 'video' })
      .catch(() => {});
    throw new HttpError(400, `Video must be ${MAX_VIDEO_SECONDS} seconds or shorter`);
  }
  return result.secure_url;
}

/** Uploads whatever Multer collected. Returns { photos, videoUrl }. */
export async function uploadReviewFiles(files) {
  if (!files) return { photos: [], videoUrl: null };

  const photos = await Promise.all((files.photos ?? []).map((f) => uploadImage(f)));
  const videoUrl = files.video?.[0] ? await uploadVideo(files.video[0]) : null;
  return { photos, videoUrl };
}
