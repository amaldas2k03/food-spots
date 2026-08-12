import api from './client.js';

export const register = (data) => api.post('/auth/register', data).then((r) => r.data);
export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);
export const googleLogin = (credential) =>
  api.post('/auth/google', { credential }).then((r) => r.data);
export const fetchMe = () => api.get('/auth/me').then((r) => r.data.user);
