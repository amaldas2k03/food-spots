import StarRating from './StarRating.jsx';

export default function DishCard({ dish, selectable = false, selected = false, onSelect }) {
  const Wrapper = selectable ? 'button' : 'div';

  return (
    <Wrapper
      {...(selectable ? { type: 'button', onClick: () => onSelect?.(dish) } : {})}
      className={`card w-full overflow-hidden p-3 text-left transition-shadow ${
        selectable ? 'cursor-pointer hover:shadow-[var(--shadow-lift)]' : ''
      } ${selected ? 'ring-2 ring-accent' : ''}`}
    >
      <div className="flex gap-3">
        {dish.photoUrl && (
          <img
            src={dish.photoUrl}
            alt={dish.name}
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <h4 className="truncate font-medium">{dish.name}</h4>
          {dish.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{dish.description}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <StarRating value={dish.avgRating} size={13} showValue />
            {dish._count?.ratings > 0 && (
              <span className="text-xs text-muted">({dish._count.ratings})</span>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
