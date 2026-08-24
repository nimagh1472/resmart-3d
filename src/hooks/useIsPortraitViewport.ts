'use client';

import { useEffect, useState } from 'react';

const QUERY = '(max-width: 768px) and (orientation: portrait)';

/**
 * True on phone-sized portrait viewports, where object-fit:cover on the
 * cinematic's 16:9-ish source images shows only ~25-30% of the original
 * width — MediaLayer uses this to switch to each scene's mobileFocalX
 * instead of a center crop that can cut off the named focal subject.
 * One shared listener (not one per media layer) to avoid seven duplicate
 * matchMedia subscriptions.
 */
export function useIsPortraitViewport(): boolean {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setIsPortrait(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isPortrait;
}
