import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Bookmark } from 'lucide-react';
import { settle } from '../motion/index.js';

export default function ListCard({ list }) {
  const count = list.spotCount ?? list._count?.spots ?? 0;

  return (
    <motion.div whileHover={{ y: -6 }} transition={settle} className="group h-full">
      <Link
        to={`/lists/${list.id}`}
        className="flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-[var(--shadow-card)] transition-shadow duration-[var(--dur-base)] group-hover:shadow-[var(--shadow-lift)]"
      >
        <div className="grade-warm relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-accent-soft">
          {list.coverPhoto ? (
            <img
              src={list.coverPhoto}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-hover:scale-105"
            />
          ) : (
            /* No cover: a bookmark on a tinted ground, with the spot count
               set large so the card still has something to look at. */
            <>
              <Bookmark size={30} className="text-accent" aria-hidden />
              <span
                className="absolute right-3 bottom-2 font-display text-4xl font-black text-accent/15"
                aria-hidden
              >
                {count}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-lg font-semibold">{list.title}</h3>
            {!list.isPublic && (
              <Lock size={13} className="shrink-0 text-muted" aria-label="Private list" />
            )}
          </div>

          {list.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{list.description}</p>
          )}

          <p className="label-caps mt-auto pt-3 text-muted">
            {count} spot{count === 1 ? '' : 's'}
            {list.user ? ` · ${list.user.name}` : ''}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
