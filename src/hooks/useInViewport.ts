'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Continuously tracks whether an element is in the viewport (unlike
 * useInViewOnce, which disconnects after the first entry) — used to drive
 * scroll-reversible effects, e.g. the Investor Terminal scene's background
 * tint switching back off when scrolled past.
 */
export function useInViewport<T extends Element>(threshold = 0.4) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}
