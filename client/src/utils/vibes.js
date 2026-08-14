/**
 * Vibe tags.
 *
 * There is no `vibeTags` column on Spot, so these are derived from fields that
 * do exist rather than invented. That keeps the labels honest — every one of
 * them is a statement about real data the user could verify — and it means
 * vibe filtering works today without a schema change.
 *
 * "Hidden gem" deliberately reuses the exact threshold the server's
 * /spots/hidden-gems endpoint uses (4.5+ rating, under 20 reviews) so a spot
 * badged as a gem on a card is the same spot that shows up in that row.
 */

const QUICK_CUISINES = ['Street Food', 'Cafe', 'Bakery'];

export const VIBES = [
  {
    id: 'hidden-gem',
    label: 'Hidden gem',
    match: (s) => (s.overallRating ?? 0) >= 4.5 && (s.reviewCount ?? 0) < 20,
  },
  {
    id: 'crowd-favourite',
    label: 'Crowd favourite',
    match: (s) => (s.reviewCount ?? 0) >= 50,
  },
  {
    id: 'date-night',
    label: 'Date night',
    match: (s) => (s.priceRange ?? 0) >= 3,
  },
  {
    id: 'quick-bite',
    label: 'Quick bite',
    match: (s) =>
      (s.priceRange ?? 4) <= 2 && (s.cuisineType ?? []).some((c) => QUICK_CUISINES.includes(c)),
  },
  {
    id: 'late-night',
    label: 'Late night',
    match: (s) =>
      Object.values(s.hours ?? {}).some((h) => {
        if (!h?.close) return false;
        const hour = Number(String(h.close).split(':')[0]);
        // Closing at or after 23:00, or in the small hours (00:00–04:00).
        return hour >= 23 || hour <= 4;
      }),
  },
  {
    id: 'worth-the-trip',
    label: 'Worth the trip',
    match: (s) => (s.overallRating ?? 0) >= 4.7 && (s.reviewCount ?? 0) >= 20,
  },
];

/** All vibes a spot qualifies for, most distinctive first. */
export function vibesFor(spot) {
  if (!spot) return [];
  return VIBES.filter((v) => {
    try {
      return v.match(spot);
    } catch {
      return false;
    }
  });
}

/** The single most interesting vibe, for surfaces with room for only one. */
export function topVibe(spot) {
  return vibesFor(spot)[0] ?? null;
}

/** Client-side filter used by search — `selected` is an array of vibe ids. */
export function matchesVibes(spot, selected) {
  if (!selected?.length) return true;
  const ids = new Set(vibesFor(spot).map((v) => v.id));
  return selected.every((id) => ids.has(id));
}
