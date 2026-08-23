'use client';

import { useEffect, useRef } from 'react';
import nipplejs from 'nipplejs';
import { Zap } from 'lucide-react';
import { controlsState } from '@/hooks/useKeyboardControls';

/**
 * Virtual joystick + nitro boost button for touch devices, both feeding the
 * same shared controlsState that keyboard input writes to so Vehicle doesn't
 * need to know the input source.
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
      controlsState.boost = false;
    };
  }, []);

  const setBoost = (isBoosting: boolean) => {
    controlsState.boost = isBoosting;
  };

  return (
    <>
      <div
        ref={zoneRef}
        className="pointer-events-auto absolute bottom-4 left-4 z-10 h-44 w-44 touch-none md:hidden"
        aria-hidden="true"
      />
      <button
        onPointerDown={() => setBoost(true)}
        onPointerUp={() => setBoost(false)}
        onPointerLeave={() => setBoost(false)}
        onPointerCancel={() => setBoost(false)}
        aria-label="Nitro boost"
        className="pointer-events-auto absolute bottom-6 right-4 z-10 flex h-20 w-20 touch-none select-none items-center justify-center rounded-full border-2 border-cyan-300/70 bg-[rgba(10,16,26,0.85)] text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.5)] backdrop-blur-md active:scale-95 active:bg-cyan-500/30 md:hidden"
      >
        <Zap size={30} strokeWidth={2.4} />
      </button>
    </>
  );
}
