import axios from 'axios';

export const TOKEN_KEY = 'foodspots_token';

const api = axios.create({
  // Empty base URL in dev: Vite proxies /api to the server.
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // An expired token shouldn't strand the user on a broken page.
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    // Surface the server's message so callers can display it directly.
    error.message = error.response?.data?.error || error.message;
    return Promise.reject(error);
  },
);

export default api;
