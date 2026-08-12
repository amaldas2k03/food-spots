import api from './client.js';

export const createCrawl = (title, spotIds) =>
  api.post('/crawls', { title, spotIds }).then((r) => r.data);
export const getCrawl = (id) => api.get(`/crawls/${id}`).then((r) => r.data.crawl);
export const getCrawlRoute = (id) => api.get(`/crawls/${id}/route`).then((r) => r.data.route);
export const previewRoute = (spotIds) =>
  api.post('/crawls/preview', { spotIds }).then((r) => r.data.route);
