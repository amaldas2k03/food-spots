import { create } from 'zustand';
import { io } from 'socket.io-client';
import * as notificationsApi from '../api/notifications.js';
import { TOKEN_KEY } from '../api/client.js';

let socket = null;

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unread: 0,

  async load() {
    try {
      const { notifications, unread } = await notificationsApi.getNotifications();
      set({ notifications, unread });
    } catch {
      // A failed poll shouldn't break the navbar.
    }
  },

  /** Opens the Socket.io channel so the bell updates without polling. */
  connect() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || socket) return;

    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('notification', (notification) => {
      set((s) => ({
        notifications: [notification, ...s.notifications],
        unread: s.unread + 1,
      }));
    });

    socket.on('connect_error', (err) => console.warn('Notification socket:', err.message));
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
    set({ notifications: [], unread: 0 });
  },

  async markRead(id) {
    const target = get().notifications.find((n) => n.id === id);
    if (!target || target.read) return;

    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unread: Math.max(0, s.unread - 1),
    }));
    await notificationsApi.markRead(id).catch(() => get().load());
  },

  async markAllRead() {
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })), unread: 0 }));
    await notificationsApi.markAllRead().catch(() => get().load());
  },
}));
