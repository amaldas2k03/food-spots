/** Falls back to initials when a user has no avatar_url. */
export default function Avatar({ user, size = 32, className = '' }) {
  const initials = (user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-label={user?.name}
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-medium text-accent ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
