import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { SaveButton, Tag } from './ui/index.js';
import { priceLabel, formatDistance } from '../utils/format.js';
import { topVibe } from '../utils/vibes.js';
import { useSavedStore } from '../store/savedStore.js';
import { useAuthStore } from '../store/authStore.js';
import { settle } from '../motion/index.js';

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect width='400' height='500' fill='%23FBEDE4'/%3E%3Cpath d='M170 230a30 30 0 1 1 60 0 30 30 0 0 1-60 0Z' fill='%23DCC9B6'/%3E%3Crect x='140' y='285' width='120' height='10' rx='5' fill='%23DCC9B6'/%3E%3C/svg%3E";

/**
 * The food spot card — the atom the whole app is built from.
 *
 * Three things carry the craft here:
 *
 *  1. **Shared element.** The photo and title carry `layoutId`s that match the
 *     detail page's hero, so tapping a card morphs the image up into the hero
 *     rather than cutting to a new screen.
 *  2. **Editorial overlay.** The name sits on the photo over a scrim strong
 *     enough (charcoal at 88%) to guarantee white text contrast over *any*
 *     photograph, including a blown-out one.
 *  3. **The save button is not inside the link.** It's a sibling, so a tap on
 *     the heart can never navigate — a mistake that's easy to make and very
 *     annoying to hit.
 */
export default function SpotCard({ spot, className = '', priority = false }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const saved = useSavedStore((s) => s.ids.has(spot.id));
  const toggle = useSavedStore((s) => s.toggle);
  const [failed, setFailed] = useState(false);

  const vibe = topVibe(spot);

  async function onSave() {
    if (!user) return navigate('/login', { state: { from: `/spots/${spot.id}` } });
    try {
      await toggle(spot.id, spot);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 2600);
    }
  }

  return (
    <motion.article
      className={`group relative ${className}`}
      whileHover={{ y: -6 }}
      transition={settle}
    >
      <Link
        to={`/spots/${spot.id}`}
        className="block overflow-hidden rounded-card bg-surface shadow-[var(--shadow-card)] transition-shadow duration-[var(--dur-base)] group-hover:shadow-[var(--shadow-lift)]"
      >
        <div className="grade-warm relative aspect-[4/5] overflow-hidden">
          <motion.img
            layoutId={`spot-photo-${spot.id}`}
            src={spot.photos?.[0] || PLACEHOLDER}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER;
            }}
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-hover:scale-[1.07]"
          />

          {/* Scrim strong enough that white text clears 4.5:1 on any photo. */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-charcoal/88 via-charcoal/25 to-transparent"
            aria-hidden
          />

          {vibe && (
            <div className="absolute top-3 left-3">
              <Tag tone="olive" className="bg-bg/95 backdrop-blur-sm">
                {vibe.label}
              </Tag>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4">
            <motion.h3
              layoutId={`spot-title-${spot.id}`}
              className="font-display text-xl leading-tight font-semibold text-white drop-shadow-sm"
            >
              {spot.name}
            </motion.h3>
            <p className="label-caps mt-1.5 text-white/85">
              {spot.cuisineType?.slice(0, 2).join(' · ') || 'Food'}
              {' · '}
              {priceLabel(spot.priceRange)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <StarRating value={spot.overallRating} showValue label={`${spot.name} rating`} />
          <span className="text-xs text-muted">
            {spot.reviewCount ?? 0} review{spot.reviewCount === 1 ? '' : 's'}
          </span>
        </div>

        {spot.distance != null && (
          <p className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-xs text-muted">
            <MapPin size={13} aria-hidden />
            {formatDistance(spot.distance)} away
          </p>
        )}
      </Link>

      {/* Sibling of the link, not a child — a save must never navigate. */}
      {/* 44px, not 40 — this is the most-tapped control in the app and it sits
          in a corner, which is already the hardest place to hit accurately. */}
      <div className="absolute top-2.5 right-2.5">
        <SaveButton saved={saved} onToggle={onSave} size={44} />
      </div>

      {failed && (
        <motion.p
          role="status"
          className="absolute inset-x-2 bottom-2 rounded-lg bg-danger px-3 py-2 text-center text-xs font-medium text-white"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Couldn’t save that — try again
        </motion.p>
      )}
    </motion.article>
  );
}
