'use client';

import { useEffect, useRef } from 'react';

/**
 * Normalized (-1..1) pointer position for subtle cinematic parallax — ported
 * from the archived src/components/three/SceneTimeline.tsx. A ref, not
 * state: parallax reads this every animation frame in MediaLayer, and
 * re-rendering the whole React tree on every mousemove would be wasteful.
 */
export function useParallaxPointer() {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return pointer;
}
