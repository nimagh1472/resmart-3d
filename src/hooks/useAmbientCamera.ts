import { useEffect, useRef } from 'react';

export interface PointerOffset {
  x: number;
  y: number;
}

/**
 * Normalized (-1..1) pointer/touch position, updated via plain window
 * listeners (not React state) so the ambient camera rig can read it every
 * frame inside useFrame without triggering a re-render per mouse-move.
 */
export function usePointerOffset() {
  const offsetRef = useRef<PointerOffset>({ x: 0, y: 0 });

  useEffect(() => {
    function setFromClient(clientX: number, clientY: number) {
      offsetRef.current = {
        x: (clientX / window.innerWidth) * 2 - 1,
        y: (clientY / window.innerHeight) * 2 - 1,
      };
    }
    function handleMouseMove(event: MouseEvent) {
      setFromClient(event.clientX, event.clientY);
    }
    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (touch) setFromClient(touch.clientX, touch.clientY);
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return offsetRef;
}
