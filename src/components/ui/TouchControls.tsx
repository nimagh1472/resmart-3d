'use client';

import { useEffect, useRef } from 'react';
import nipplejs from 'nipplejs';
import { controlsState } from '@/hooks/useKeyboardControls';

/**
 * Virtual joystick for touch devices, feeding the same shared controlsState
 * that keyboard input writes to so Vehicle doesn't need to know the input
 * source.
 */
export function TouchControls() {
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const manager = nipplejs.create({
      zone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#1d4ed8',
      size: 110,
    });

    manager.on('move', (moveEvent) => {
      const vector = moveEvent.data.vector;
      controlsState.forward = Math.max(-1, Math.min(1, vector.y));
      controlsState.turn = Math.max(-1, Math.min(1, -vector.x));
    });

    manager.on('end', () => {
      controlsState.forward = 0;
      controlsState.turn = 0;
    });

    return () => {
      manager.destroy();
      controlsState.forward = 0;
      controlsState.turn = 0;
    };
  }, []);

  return (
    <div
      ref={zoneRef}
      className="pointer-events-auto absolute bottom-4 left-4 z-10 h-44 w-44 touch-none md:hidden"
      aria-hidden="true"
    />
  );
}
