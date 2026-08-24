'use client';

import { useMemo } from 'react';

const LAMP_COLOR = '#ffb870';
const LAMP_SPACING = 24;
const LAMP_COUNT_PER_SIDE = 8;
const LAMP_Z_START = -20;

interface LampPost {
  position: [number, number, number];
}

function buildLamps(side: 1 | -1): LampPost[] {
  return Array.from({ length: LAMP_COUNT_PER_SIDE }, (_, index) => ({
    position: [side * 16, 0, LAMP_Z_START - index * LAMP_SPACING] as [number, number, number],
  }));
}

/**
 * Background-tier street furniture — Phase 03 explicitly allows simpler,
 * self-authored geometry for scatter/prop-tier elements (unlike hero
 * landmarks, which must never be a primitive substitute). Each lamp only
 * gets a real dynamic point light if it's within CULL_DISTANCE of world
 * origin (the camera's operating range for this slice), matching Phase 03's
 * lighting-culling budget — everything else is emissive-only.
 */
const CULL_DISTANCE = 90;

function LampPost({ position }: LampPost) {
  const withinCullRange = Math.abs(position[2]) < CULL_DISTANCE;

  return (
    <group position={position}>
      <mesh position={[0, 3, 0]} castShadow={false}>
        <cylinderGeometry args={[0.06, 0.08, 6, 8]} />
        <meshStandardMaterial color="#1a1d21" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color={LAMP_COLOR} emissive={LAMP_COLOR} emissiveIntensity={withinCullRange ? 2.5 : 1.2} />
      </mesh>
      {withinCullRange && <pointLight position={[0, 6.1, 0]} color={LAMP_COLOR} intensity={6} distance={14} decay={2} />}
    </group>
  );
}

export function StreetLighting() {
  const lamps = useMemo(() => [...buildLamps(1), ...buildLamps(-1)], []);
  return (
    <>
      {lamps.map((lamp, index) => (
        <LampPost key={index} position={lamp.position} />
      ))}
    </>
  );
}
