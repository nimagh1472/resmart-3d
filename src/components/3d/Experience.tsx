'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, type RootState } from '@react-three/fiber';
import { Physics, type RapierRigidBody } from '@react-three/rapier';
import { PerformanceMonitor } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { Environment } from '@/components/3d/Environment';
import { Ground } from '@/components/3d/Ground';
import { World } from '@/components/3d/World';
import { Zones } from '@/components/3d/Zones';
import { Vehicle } from '@/components/3d/Vehicle';
import { CameraRig } from '@/components/3d/CameraRig';
import { TrafficObstacles } from '@/components/3d/TrafficObstacles';
import { InvestorSimulationScene } from '@/components/games/InvestorSimulationScene';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useRoleStore } from '@/hooks/useRoleStore';

function detectIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || window.innerWidth < 768;
}

/**
 * Root 3D scene. Mounted client-only (see app/page.tsx) since Canvas/WebGL
 * has no meaningful server-rendered output.
 */
export function Experience() {
  const vehicleRef = useRef<RapierRigidBody>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const setWebGLError = useRoleStore((state) => state.setWebGLError);
  const [isMobile] = useState(detectIsMobile);
  const [canvasKey, setCanvasKey] = useState(0);
  // FPS safeguard: PerformanceMonitor (drei) samples the actual rendered
  // frame rate and flips this once sustained frames land below ~45fps —
  // Environment/World/Vehicle all fold isDegraded into the same isMobile
  // branches they already use to drop shadows/SSAO/Bloom, so a struggling
  // desktop GPU gets the same relief a phone gets by default. onIncline
  // restores quality if performance recovers (e.g. an initial load spike).
  const [isDegraded, setIsDegraded] = useState(false);
  useKeyboardControls();

  const handleContextLost = useCallback(
    (event: Event) => {
      event.preventDefault();
      setWebGLError(true);
    },
    [setWebGLError],
  );

  const handleContextRestored = useCallback(() => {
    setWebGLError(false);
    // Force a full Canvas remount so three.js re-initializes GPU resources
    // against the fresh WebGL context rather than trying to resume with
    // buffers/textures the lost context invalidated.
    setCanvasKey((key) => key + 1);
  }, [setWebGLError]);

  const handleCreated = useCallback(
    (state: RootState) => {
      canvasElementRef.current = state.gl.domElement;
      state.gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
      state.gl.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);
    },
    [handleContextLost, handleContextRestored],
  );

  // Explicit cleanup on unmount, in addition to the implicit cleanup that
  // happens when the <canvas> DOM node itself is removed on a canvasKey
  // remount (context-restored) or a full Experience unmount.
  useEffect(() => {
    return () => {
      const canvasElement = canvasElementRef.current;
      if (!canvasElement) return;
      canvasElement.removeEventListener('webglcontextlost', handleContextLost, false);
      canvasElement.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [handleContextLost, handleContextRestored]);

  return (
    <Canvas
      key={canvasKey}
      shadows={isMobile || isDegraded ? false : 'soft'}
      camera={{ position: [20, 18, 20], fov: 42, near: 0.5, far: 800 }}
      dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.25)}
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
      <PerformanceMonitor
        bounds={() => [45, 60]}
        flipflops={2}
        onDecline={() => setIsDegraded(true)}
        onIncline={() => setIsDegraded(false)}
      />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <Environment isMobile={isMobile || isDegraded} />
          <Ground />
          <World isMobile={isMobile || isDegraded} />
          <TrafficObstacles vehicleRef={vehicleRef} />
          <Zones vehicleRef={vehicleRef} />
          <Vehicle ref={vehicleRef} isMobile={isMobile || isDegraded} />
          <CameraRig vehicleRef={vehicleRef} />
          <InvestorSimulationScene />
        </Physics>
      </Suspense>
    </Canvas>
  );
}

export default Experience;
