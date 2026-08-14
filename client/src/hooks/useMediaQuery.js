import { useEffect, useState } from 'react';

/**
 * Subscribes to a media query. Used for behaviour that genuinely differs
 * between form factors (a drawer that slides up on a phone but in from the
 * side on a desktop), not for styling — styling stays in Tailwind's
 * breakpoints so it works before JS hydrates.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Tailwind's `md` breakpoint, kept in one place so JS and CSS agree. */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
