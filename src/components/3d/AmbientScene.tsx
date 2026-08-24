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

// Module-level scratch target — reused every frame instead of allocating a
// fresh Vector3 per lookAt call.
const LOOK_AT_TARGET = new Vector3(0, 12, 0);

/**
 * Slowly orbits/pans the camera around the skyline based on mouse-move /
 * touch-drag position, lerped for smoothness (no hard camera snaps). No
 * chase-cam math, no vehicle — this only reads a plain pointer-offset ref.
 */
function AmbientCameraRig({ pointerOffsetRef }: { pointerOffsetRef: { current: PointerOffset } }) {
  const angleRef = useRef(0);

  useFrame((state, delta) => {
    angleRef.current += AUTO_ROTATE_SPEED * delta;
    const pointer = pointerOffsetRef.current;
    const targetAngle = angleRef.current + pointer.x * POINTER_INFLUENCE_ANGLE;
    const targetHeight = BASE_HEIGHT + pointer.y * POINTER_INFLUENCE_HEIGHT;
    const targetX = Math.sin(targetAngle) * BASE_RADIUS;
    const targetZ = Math.cos(targetAngle) * BASE_RADIUS;

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
 * Ambient 3D backdrop — a glowing Dubai night skyline with a slow
 * pointer-driven camera drift, per-district glow zones, and a looping
 * network pulse. No physics, no vehicle, no gameplay. dpr is capped to
 * [1, 1.25] on desktop and locked to exactly 1 on mobile (<768px/touch), and
 * PerformanceMonitor/AdaptiveDpr keep this at a guaranteed-smooth frame rate
 * regardless of what's rendered on top of it in the DOM.
 */
export function AmbientScene({ selectedDistrict, hoveredDistrict }: AmbientSceneProps) {
  const [isMobile] = useState(detectIsMobile);
  const [isDegraded, setIsDegraded] = useState(false);
  const pointerOffsetRef = usePointerOffset();

  const handleCreated = (state: RootState) => {
    state.camera.position.set(0, BASE_HEIGHT, BASE_RADIUS);
  };

  return (
    <Canvas
      shadows={false}
      camera={{ position: [0, BASE_HEIGHT, BASE_RADIUS], fov: 45, near: 0.5, far: 800 }}
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
        <AmbientCameraRig pointerOffsetRef={pointerOffsetRef} />
      </Suspense>
    </Canvas>
  );
}

export default AmbientScene;
