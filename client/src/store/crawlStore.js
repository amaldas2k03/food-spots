import { create } from 'zustand';

/** Draft crawl being assembled on /crawl. Cleared once saved. */
export const useCrawlStore = create((set, get) => ({
  stops: [],
  title: '',

  setTitle: (title) => set({ title }),

  addStop(spot) {
    if (get().stops.some((s) => s.id === spot.id)) return;
    set((s) => ({ stops: [...s.stops, spot] }));
  },

  removeStop: (spotId) => set((s) => ({ stops: s.stops.filter((x) => x.id !== spotId) })),

  /** Moves a stop to a new index, used by the drag-to-reorder list. */
  moveStop(from, to) {
    const stops = [...get().stops];
    if (to < 0 || to >= stops.length) return;
    const [moved] = stops.splice(from, 1);
    stops.splice(to, 0, moved);
    set({ stops });
  },

  reset: () => set({ stops: [], title: '' }),
}));
