import { create } from 'zustand';
import * as listsApi from '../api/lists.js';

const FAVOURITES_TITLE = 'Favourites';

/**
 * One-tap favourites, backed by a real list.
 *
 * The heart on a card needs to persist somewhere, and the API's unit of saving
 * is a list — so this store finds (or creates, once) a list called
 * "Favourites" and treats membership in it as the saved state. Nothing is
 * stored client-only, so a save made on a phone is there on a laptop.
 *
 * Toggles are optimistic and roll back on failure: waiting on a round trip
 * before the heart fills would undercut the whole interaction.
 */
export const useSavedStore = create((set, get) => ({
  listId: null,
  ids: new Set(),
  /** The full spot objects, so the Favourites view renders without a refetch. */
  spots: [],
  ready: false,
  loading: false,

  /** Idempotent — safe to call from every mount. */
  async init() {
    if (get().ready || get().loading) return;
    set({ loading: true });
    try {
      const lists = await listsApi.getLists();
      const favourites = lists.find((l) => l.title === FAVOURITES_TITLE);
      if (!favourites) {
        // Don't create the list until the user actually saves something —
        // an empty auto-created list cluttering their collection is worse
        // than a one-off delay on first save.
        return set({ ready: true, loading: false, listId: null, ids: new Set(), spots: [] });
      }
      // GET /lists/:id flattens its join rows, so `spots` is Spot objects.
      const full = await listsApi.getList(favourites.id);
      const spots = full.spots ?? [];
      set({
        listId: favourites.id,
        ids: new Set(spots.map((s) => s.id)),
        spots,
        ready: true,
        loading: false,
      });
    } catch {
      // Signed out, or the lists endpoint is unavailable. Hearts stay empty
      // and toggling will surface the real error at that point.
      set({ ready: true, loading: false });
    }
  },

  isSaved: (spotId) => get().ids.has(spotId),

  /**
   * Returns true if the spot ended up saved. Throws on a failed write.
   *
   * `spot` is optional but worth passing: with it, the Favourites view updates
   * instantly from the caller's own copy instead of refetching the list.
   */
  async toggle(spotId, spot = null) {
    const { ids, listId, spots } = get();
    const wasSaved = ids.has(spotId);

    const optimistic = new Set(ids);
    if (wasSaved) optimistic.delete(spotId);
    else optimistic.add(spotId);

    const optimisticSpots = wasSaved
      ? spots.filter((s) => s.id !== spotId)
      : spot && !spots.some((s) => s.id === spotId)
        ? [spot, ...spots]
        : spots;

    set({ ids: optimistic, spots: optimisticSpots });

    try {
      let id = listId;
      if (!id) {
        const created = await listsApi.createList({
          title: FAVOURITES_TITLE,
          description: 'Places I want to remember.',
        });
        id = created.id;
        set({ listId: id });
      }

      if (wasSaved) await listsApi.removeSpotFromList(id, spotId);
      else await listsApi.addSpotToList(id, spotId);

      return !wasSaved;
    } catch (err) {
      set({ ids, spots }); // roll back to the exact previous state
      throw err;
    }
  },

  reset: () => set({ listId: null, ids: new Set(), spots: [], ready: false, loading: false }),
}));
