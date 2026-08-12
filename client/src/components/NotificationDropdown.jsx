import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore.js';
import { timeAgo } from '../utils/format.js';

/** Turns a stored notification into a readable line. */
function describe(n) {
  const p = n.payload ?? {};
  switch (n.type) {
    case 'new_follower':
      return `${p.name ?? 'Someone'} started following you`;
    case 'review_helpful':
      return `${p.fromUser ?? 'Someone'} found your review helpful`;
    case 'review_on_your_spot':
      return `${p.fromUser ?? 'Someone'} reviewed ${p.spotName ?? 'your spot'}`;
    case 'owner_responded':
      return `The owner of ${p.spotName ?? 'a spot'} replied to your review`;
    default:
      return 'You have a new notification';
  }
}

export default function NotificationDropdown() {
  const { notifications, unread, load, markRead, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    load();
  }, [load]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative rounded-lg p-2 hover:bg-bg"
      >
        <Bell size={19} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nothing here yet</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-bg ${
                      n.read ? '' : 'bg-accent-soft/40'
                    }`}
                  >
                    <p className="text-sm">{describe(n)}</p>
                    <p className="mt-0.5 text-xs text-muted">{timeAgo(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
