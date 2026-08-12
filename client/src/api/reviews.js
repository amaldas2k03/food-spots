import api from './client.js';

export const getReviews = (spotId, sort = 'newest') =>
  api.get(`/spots/${spotId}/reviews`, { params: { sort } }).then((r) => r.data.reviews);

/**
 * Reviews go up as multipart/form-data because they can carry photos and a video.
 * Coords are optional — the server treats missing coords as "not verified".
 */
export function createReview(spotId, { overallRating, text, dishRatings, photos, video, coords }) {
  const form = new FormData();
  form.append('overallRating', String(overallRating));
  form.append('text', text);
  form.append('dishRatings', JSON.stringify(dishRatings ?? []));

  if (coords) {
    form.append('lat', String(coords.lat));
    form.append('lng', String(coords.lng));
  }
  (photos ?? []).forEach((file) => form.append('photos', file));
  if (video) form.append('video', video);

  return api.post(`/spots/${spotId}/reviews`, form).then((r) => r.data);
}

export const voteHelpful = (reviewId) => api.post(`/reviews/${reviewId}/helpful`).then((r) => r.data);
export const voteNotHelpful = (reviewId) =>
  api.post(`/reviews/${reviewId}/not-helpful`).then((r) => r.data);
export const respondToReview = (reviewId, text) =>
  api.post(`/reviews/${reviewId}/owner-response`, { text }).then((r) => r.data.ownerResponse);
