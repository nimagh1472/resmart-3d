export interface ImpactShakeState {
  intensity: number;
}

/**
 * Mutable, module-level camera-shake singleton — the same write-from-3D-scene,
 * read-from-elsewhere pattern useVehicleTelemetry.ts uses for position.
 * Vehicle.tsx bumps `intensity` to 1 on every obstacle collision (see
 * handleCollisionEnter); CameraRig.tsx decays it toward 0 every frame and
 * applies a proportional random jitter to the camera, so an impact reads as
 * a punchy shake without either component needing to know about the other's
 * internals or route the value through React state/re-renders.
 */
export const impactShake: ImpactShakeState = { intensity: 0 };
