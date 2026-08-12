import { Link } from 'react-router-dom';
import { Lock, Bookmark } from 'lucide-react';

export default function ListCard({ list }) {
  return (
    <Link
      to={`/lists/${list.id}`}
      className="card block overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex aspect-[16/9] items-center justify-center bg-accent-soft">
        {list.coverPhoto ? (
          <img src={list.coverPhoto} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Bookmark size={32} className="text-accent" />
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-semibold">{list.title}</h3>
          {!list.isPublic && <Lock size={12} className="shrink-0 text-muted" />}
        </div>

        {list.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{list.description}</p>
        )}

        <p className="mt-2 text-xs text-muted">
          {list.spotCount ?? list._count?.spots ?? 0} spots
          {list.user ? ` · ${list.user.name}` : ''}
        </p>
      </div>
    </Link>
  );
}
