export const priceLabel = (range) => '$'.repeat(Math.max(1, Math.min(4, range || 1)));

export function formatDistance(meters) {
  if (meters == null) return null;
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds) {
  if (seconds == null) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`;
}

export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value} ${name}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Reads the spot's `hours` JSON against local time. */
export function isOpenNow(hours) {
  if (!hours) return null;
  const now = new Date();
  const today = hours[DAYS[now.getDay()]];
  if (!today?.open || !today?.close) return null;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return minutes >= toMinutes(today.open) && minutes < toMinutes(today.close);
}

export const CUISINES = [
  'South Indian', 'North Indian', 'Mughlai', 'Chinese', 'Japanese', 'Italian',
  'Mexican', 'American', 'Barbecue', 'Continental', 'Cafe', 'Bakery',
  'Street Food', 'Ramen', 'Tibetan', 'Healthy', 'Vegetarian',
];

export const DIETARY_TAGS = ['Vegan', 'Halal', 'Gluten-Free', 'Vegetarian'];
