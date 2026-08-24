'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether an element has ever scrolled into view, then disconnects —
 * used to drive one-time fade/slide-in reveals (e.g. StoryCards) without
 * re-triggering on every scroll back into view.
 */
export function useInViewOnce<T extends Element>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}
