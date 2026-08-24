'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, type RootState } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { ACESFilmicToneMapping, MathUtils, Vector3 } from 'three';
import { Environment } from '@/components/3d/Environment';
import { World } from '@/components/3d/World';
import { usePointerOffset, type PointerOffset } from '@/hooks/useAmbientCamera';
import type { DistrictId } from '@/types';

function detectIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || window.innerWidth < 768;
}

const BASE_RADIUS = 34;
const BASE_HEIGHT = 16;
const AUTO_ROTATE_SPEED = 0.03; // radians/sec — slow, ambient drift
const POINTER_INFLUENCE_ANGLE = 0.35; // radians of extra pan from a full pointer swing
const POINTER_INFLUENCE_HEIGHT = 4;
const LERP_FACTOR = 0.04;

// Cinematic intro: the camera starts far down Sheikh Zayed Road and above
// the skyline, then dollies forward/down into the city before handing off
// into the ambient orbit below.
const FLIGHT_START_Z = 150;
const FLIGHT_START_HEIGHT = 32;
const FLIGHT_DURATION_SECONDS = 13;

// Module-level scratch target — reused every frame instead of allocating a
// fresh Vector3 per lookAt call.
const LOOK_AT_TARGET = new Vector3(0, 12, 0);

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Cinematic "flying into Downtown Dubai" open: a one-time forward/downward
 * dolly from FLIGHT_START_Z/FLIGHT_START_HEIGHT toward the central tower,
 * eased with easeOutCubic over FLIGHT_DURATION_SECONDS. The flight path's
 * end state (x=0, z=BASE_RADIUS, y=BASE_HEIGHT, angle 0) is exactly the
 * orbit rig's start point, so once the flight completes it hands off into
 * the slow pointer-driven orbit with no camera pop.
 */
function CinematicFlyCameraRig({ pointerOffsetRef }: { pointerOffsetRef: { current: PointerOffset } }) {
  const angleRef = useRef(0);
  const flightElapsedRef = useRef(0);

  useFrame((state, delta) => {
    const pointer = pointerOffsetRef.current;
    let targetX: number;
    let targetHeight: number;
    let targetZ: number;

    if (flightElapsedRef.current < FLIGHT_DURATION_SECONDS) {
      flightElapsedRef.current = Math.min(FLIGHT_DURATION_SECONDS, flightElapsedRef.current + delta);
      const progress = easeOutCubic(flightElapsedRef.current / FLIGHT_DURATION_SECONDS);
      targetX = pointer.x * POINTER_INFLUENCE_ANGLE * BASE_RADIUS * progress;
      targetHeight = MathUtils.lerp(FLIGHT_START_HEIGHT, BASE_HEIGHT, progress) + pointer.y * POINTER_INFLUENCE_HEIGHT * progress;
      targetZ = MathUtils.lerp(FLIGHT_START_Z, BASE_RADIUS, progress);
    } else {
      angleRef.current += AUTO_ROTATE_SPEED * delta;
      const targetAngle = angleRef.current + pointer.x * POINTER_INFLUENCE_ANGLE;
      targetX = Math.sin(targetAngle) * BASE_RADIUS;
      targetHeight = BASE_HEIGHT + pointer.y * POINTER_INFLUENCE_HEIGHT;
      targetZ = Math.cos(targetAngle) * BASE_RADIUS;
    }

    state.camera.position.x = MathUtils.lerp(state.camera.position.x, targetX, LERP_FACTOR);
    state.camera.position.y = MathUtils.lerp(state.camera.position.y, targetHeight, LERP_FACTOR);
    state.camera.position.z = MathUtils.lerp(state.camera.position.z, targetZ, LERP_FACTOR);
    state.camera.lookAt(LOOK_AT_TARGET);
  });

  return null;
}

interface AmbientSceneProps {
  selectedDistrict?: DistrictId;
  hoveredDistrict?: DistrictId | null;
}

/**
 * Cinematic 3D backdrop — a glowing cyber-Dubai night skyline the camera
 * flies into on load (CinematicFlyCameraRig), then settles into a slow
 * pointer-driven orbit, over neon traffic streams, per-district glow zones,
 * and a looping network pulse. No physics, no vehicle, no gameplay. dpr is capped to
 * [1, 1.25] on desktop and locked to exactly 1 on mobile (<768px/touch), and
 * PerformanceMonitor/AdaptiveDpr keep this at a guaranteed-smooth frame rate
 * regardless of what's rendered on top of it in the DOM.
 */
export function AmbientScene({ selectedDistrict, hoveredDistrict }: AmbientSceneProps) {
  const [isMobile] = useState(detectIsMobile);
  const [isDegraded, setIsDegraded] = useState(false);
  const pointerOffsetRef = usePointerOffset();

  const handleCreated = (state: RootState) => {
    state.camera.position.set(0, FLIGHT_START_HEIGHT, FLIGHT_START_Z);
  };

  return (
    <Canvas
      shadows={false}
      camera={{ position: [0, FLIGHT_START_HEIGHT, FLIGHT_START_Z], fov: 45, near: 0.5, far: 800 }}
      dpr={isMobile ? 1 : [1, 1.25]}
      performance={{ min: 0.5 }}
      gl={{
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 0.95,
        powerPreference: 'high-performance',
        antialias: false,
        stencil: false,
        depth: true,
      }}
      onCreated={handleCreated}
    >
      <PerformanceMonitor bounds={() => [50, 60]} flipflops={2} onDecline={() => setIsDegraded(true)} onIncline={() => setIsDegraded(false)} />
      <AdaptiveDpr pixelated={false} />
      <Suspense fallback={null}>
        <Environment isMobile={isMobile || isDegraded} />
        <World isMobile={isMobile || isDegraded} selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict} />
        <CinematicFlyCameraRig pointerOffsetRef={pointerOffsetRef} />
      </Suspense>
    </Canvas>
  );
}

export default AmbientScene;
