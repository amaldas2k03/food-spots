import api from './client.js';

export const getFeed = () => api.get('/feed').then((r) => r.data);
export const getSuggestedUsers = () => api.get('/suggested-users').then((r) => r.data.users);
export const getLeaderboard = () => api.get('/leaderboard').then((r) => r.data.leaderboard);
export const getProfile = (id) => api.get(`/users/${id}`).then((r) => r.data);
export const followUser = (id) => api.post(`/users/${id}/follow`).then((r) => r.data);
export const unfollowUser = (id) => api.delete(`/users/${id}/follow`).then((r) => r.data);
