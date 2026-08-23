'use client';

import { Stars } from '@react-three/drei';

interface EnvironmentProps {
  isMobile: boolean;
}

/**
 * Cyberpunk night sky and lighting rig: procedural starfield (no HDRI
 * download), a cool moonlight key light, and purple/green neon fill lights.
 * The key light only casts real-time shadows on desktop; mobile relies on
 * the vehicle's lightweight ContactShadows instead (see Vehicle.tsx).
 */
export function Environment({ isMobile }: EnvironmentProps) {
  return (
    <>
      <color attach="background" args={['#0b0a1a']} />
      <Stars radius={140} depth={60} count={2500} factor={3} saturation={0} fade speed={0.4} />

      <hemisphereLight args={['#a855f7', '#0f172a', 0.5]} />
      <ambientLight intensity={0.18} color="#22d3ee" />

      <directionalLight
        castShadow={!isMobile}
        position={[40, 60, 20]}
        intensity={1.1}
        color="#c4b5fd"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />

      <pointLight position={[-50, 14, -50]} color="#a855f7" intensity={80} distance={70} decay={2} />
      <pointLight position={[50, 14, 50]} color="#22c55e" intensity={80} distance={70} decay={2} />
      <pointLight position={[50, 14, -50]} color="#22c55e" intensity={80} distance={70} decay={2} />
      <pointLight position={[-50, 14, 50]} color="#a855f7" intensity={80} distance={70} decay={2} />

      <fog attach="fog" args={['#0b0a1a', 50, 220]} />
    </>
  );
}
