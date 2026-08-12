import { create } from 'zustand';
import * as authApi from '../api/auth.js';
import { TOKEN_KEY } from '../api/client.js';

export const useAuthStore = create((set) => ({
  user: null,
  // `loading` starts true so route guards wait for the token check instead of
  // bouncing a signed-in user to /login on first paint.
  loading: true,

  async init() {
    if (!localStorage.getItem(TOKEN_KEY)) return set({ loading: false });
    try {
      set({ user: await authApi.fetchMe(), loading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, loading: false });
    }
  },

  async login(email, password) {
    const { user, token } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, loading: false });
    return user;
  },

  async register(data) {
    const { user, token } = await authApi.register(data);
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, loading: false });
    return user;
  },

  async loginWithGoogle(credential) {
    const { user, token } = await authApi.googleLogin(credential);
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, loading: false });
    return user;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
