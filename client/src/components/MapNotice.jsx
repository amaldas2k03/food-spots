import { MapPin } from 'lucide-react';

/**
 * Stand-in for the map canvas when VITE_MAPTILER_KEY is missing or the style
 * fails to load. Map pages stay usable without tiles, so this is a notice
 * rather than an error state.
 */
export default function MapNotice({ icon: Icon = MapPin, title, hint, error, bare = false }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className={`max-w-md text-center ${bare ? '' : 'card p-6'}`}>
        <Icon size={24} className="mx-auto text-accent" />
        <p className="mt-2 font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted">
          Set <code className="rounded bg-bg px-1">VITE_MAPTILER_KEY</code> in{' '}
          <code className="rounded bg-bg px-1">client/.env</code> and reload.
          {hint ? ` ${hint}` : ''}
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
