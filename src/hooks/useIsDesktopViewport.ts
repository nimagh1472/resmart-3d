'use client';

import { useEffect, useState } from 'react';

const QUERY = '(min-width: 769px)';

/**
 * Width-based (not orientation-based) breakpoint for Spatial V2's asset
 * selection — each scene ships a dedicated desktop AND mobile file, so
 * this is a real "which authored image" decision, not an object-position
 * nudge. Width, not portrait/landscape, is the right signal: a tablet
 * turned sideways should still get the desktop asset.
 */
export function useIsDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}
