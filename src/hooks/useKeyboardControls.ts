import { useEffect } from 'react';
import type { VehicleControlsState } from '@/types';

/**
 * Mutable, module-level control state shared between keyboard input, the
 * touch joystick, and the vehicle's per-frame kinematic update. Kept outside
 * React/Zustand state on purpose: it changes at input/frame rate, and routing
 * it through React state would trigger unnecessary re-renders.
 */
export const controlsState: VehicleControlsState = {
  forward: 0,
  turn: 0,
  boost: false,
};

const FORWARD_KEYS = new Set(['ArrowUp', 'KeyW']);
const BACKWARD_KEYS = new Set(['ArrowDown', 'KeyS']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const BOOST_KEYS = new Set(['ShiftLeft', 'ShiftRight', 'Space']);

function applyKey(code: string, isDown: boolean) {
  if (FORWARD_KEYS.has(code)) controlsState.forward = isDown ? 1 : Math.min(controlsState.forward, 0);
  if (BACKWARD_KEYS.has(code)) controlsState.forward = isDown ? -1 : Math.max(controlsState.forward, 0);
  if (LEFT_KEYS.has(code)) controlsState.turn = isDown ? 1 : Math.min(controlsState.turn, 0);
  if (RIGHT_KEYS.has(code)) controlsState.turn = isDown ? -1 : Math.max(controlsState.turn, 0);
  if (BOOST_KEYS.has(code)) controlsState.boost = isDown;
}

/**
 * Wires WASD/arrow-key + shift-boost input into the shared `controlsState`.
 * Mount once near the root of the 3D experience.
 */
export function useKeyboardControls() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Space is a boost key here — without this, the browser's default
      // "scroll the page" behavior fires on every boost press.
      if (event.code === 'Space') event.preventDefault();
      applyKey(event.code, true);
    };
    const handleKeyUp = (event: KeyboardEvent) => applyKey(event.code, false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      controlsState.forward = 0;
      controlsState.turn = 0;
      controlsState.boost = false;
    };
  }, []);
}
