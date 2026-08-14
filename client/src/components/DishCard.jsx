import { motion } from 'framer-motion';
import StarRating from './StarRating.jsx';
import { snap } from '../motion/index.js';

export default function DishCard({ dish, selectable = false, selected = false, onSelect }) {
  const Wrapper = selectable ? motion.button : motion.div;

  return (
    <Wrapper
      {...(selectable
        ? {
            type: 'button',
            onClick: () => onSelect?.(dish),
            'aria-pressed': selected,
            whileHover: { y: -3 },
            whileTap: { scale: 0.98 },
          }
        : {})}
      transition={snap}
      className={`w-full overflow-hidden rounded-card bg-surface p-3.5 text-left shadow-[var(--shadow-card)] ${
        selectable ? 'cursor-pointer hover:shadow-[var(--shadow-lift)]' : ''
      } ${selected ? 'ring-2 ring-accent' : ''}`}
    >
      <div className="flex gap-3">
        {dish.photoUrl && (
          <img
            src={dish.photoUrl}
            alt=""
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <h4 className="truncate font-display text-base font-semibold">{dish.name}</h4>
          {dish.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{dish.description}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <StarRating value={dish.avgRating} size={13} showValue label={`${dish.name} rating`} />
            {dish._count?.ratings > 0 && (
              <span className="text-xs text-muted">({dish._count.ratings})</span>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
