export interface VehicleTelemetry {
  x: number;
  z: number;
  /** Current |speed| / top speed, in [0, 1] — drives Vehicle.tsx's WheelLightTrails glow/length. */
  speedFraction: number;
}

/**
 * Mutable, module-level vehicle position singleton — the read side of the
 * same pattern useKeyboardControls.ts uses for input (controlsState), just
 * flowing the other direction (3D scene -> UI). Vehicle.tsx writes to this
 * every frame; MiniMap.tsx polls it via its own requestAnimationFrame loop
 * and writes SVG attributes directly, so a 60fps position feed never has to
 * go through React state/re-renders.
 */
export const vehicleTelemetry: VehicleTelemetry = { x: 0, z: 0, speedFraction: 0 };
