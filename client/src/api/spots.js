import api from './client.js';

export const getSpots = (params) => api.get('/spots', { params }).then((r) => r.data.spots);
export const getTrending = () => api.get('/spots/trending').then((r) => r.data.spots);
export const getHiddenGems = () => api.get('/spots/hidden-gems').then((r) => r.data.spots);
export const getSpot = (id) => api.get(`/spots/${id}`).then((r) => r.data.spot);
export const createSpot = (data) => api.post('/spots', data).then((r) => r.data.spot);
export const getDishes = (id) => api.get(`/spots/${id}/dishes`).then((r) => r.data.dishes);
