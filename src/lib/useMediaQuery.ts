import { useEffect, useState } from 'react';

/**
 * Skilar `true` ef `query` (CSS media-fyrirspurn, t.d. `(min-width: 1024px)`)
 * á við núna, og uppfærist þegar gluggastærð breytist. SSR-örugg: skilar
 * `false` ef `window.matchMedia` er ekki til. Notað til að greina borðtölvu
 * frá síma þar sem útlitið er ólíkt (t.d. innfelldur Rós-flötur á borðtölvu).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
