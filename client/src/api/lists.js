import api from './client.js';

export const getLists = (params) => api.get('/lists', { params }).then((r) => r.data.lists);
export const getList = (id) => api.get(`/lists/${id}`).then((r) => r.data.list);
export const createList = (data) => api.post('/lists', data).then((r) => r.data.list);
export const addSpotToList = (listId, spotId) =>
  api.post(`/lists/${listId}/spots`, { spotId }).then((r) => r.data);
export const removeSpotFromList = (listId, spotId) =>
  api.delete(`/lists/${listId}/spots/${spotId}`).then((r) => r.data);
