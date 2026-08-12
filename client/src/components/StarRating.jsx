import { Star } from 'lucide-react';

/**
 * Read-only by default. Pass `onChange` to make it an input (used by the
 * review form and the min-rating filter).
 */
export default function StarRating({ value = 0, onChange, size = 16, showValue = false }) {
  const interactive = Boolean(onChange);

  return (
    <div className="flex items-center gap-1">
      <div className="flex" role={interactive ? 'radiogroup' : undefined}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(value);
          const Icon = (
            <Star
              size={size}
              className={filled ? 'fill-accent text-accent' : 'text-line'}
              strokeWidth={1.5}
            />
          );

          return interactive ? (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === Math.round(value)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              onClick={() => onChange(star)}
              className="cursor-pointer p-0.5 transition-transform hover:scale-110"
            >
              {Icon}
            </button>
          ) : (
            <span key={star}>{Icon}</span>
          );
        })}
      </div>
      {showValue && value > 0 && (
        <span className="text-sm font-medium text-ink">{Number(value).toFixed(1)}</span>
      )}
    </div>
  );
}
