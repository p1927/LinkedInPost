import { useEffect, useState } from 'react';

function getMatch(query: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

/**
 * Subscribes to a CSS media query. Initial state matches the viewport on first client paint
 * (numeric Panel props in react-resizable-panels are pixels; layout breakpoints must be reliable).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMatch(query));

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches); // eslint-disable-line react-hooks/set-state-in-effect
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
