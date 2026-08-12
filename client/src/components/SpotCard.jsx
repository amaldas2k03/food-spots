import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { priceLabel, formatDistance } from '../utils/format.js';

const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e0d8"/%3E%3C/svg%3E';

export default function SpotCard({ spot, className = '' }) {
  return (
    <Link
      to={`/spots/${spot.id}`}
      className={`card group block overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)] ${className}`}
    >
      <div className="aspect-[4/3] overflow-hidden bg-line">
        <img
          src={spot.photos?.[0] || PLACEHOLDER}
          alt={spot.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER;
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-3">
        <h3 className="truncate text-base font-semibold" title={spot.name}>
          {spot.name}
        </h3>

        <p className="mt-0.5 truncate text-xs text-muted">
          {spot.cuisineType?.join(' · ')}
          {spot.cuisineType?.length ? ' · ' : ''}
          {priceLabel(spot.priceRange)}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <StarRating value={spot.overallRating} showValue />
          <span className="text-xs text-muted">
            {spot.reviewCount ?? 0} review{spot.reviewCount === 1 ? '' : 's'}
          </span>
        </div>

        {spot.distance != null && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
            <MapPin size={12} />
            {formatDistance(spot.distance)} away
          </p>
        )}
      </div>
    </Link>
  );
}
