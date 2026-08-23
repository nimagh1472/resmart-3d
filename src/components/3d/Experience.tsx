'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, type RootState } from '@react-three/fiber';
import { Physics, type RapierRigidBody } from '@react-three/rapier';
import { Environment } from '@/components/3d/Environment';
import { Ground } from '@/components/3d/Ground';
import { World } from '@/components/3d/World';
import { Zones } from '@/components/3d/Zones';
import { Vehicle } from '@/components/3d/Vehicle';
import { CameraRig } from '@/components/3d/CameraRig';
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
      shadows={!isMobile}
      camera={{ position: [0, 15, 30], fov: 60, near: 0.1, far: 500 }}
      dpr={[1, 2]}
      onCreated={handleCreated}
    >
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <Environment isMobile={isMobile} />
          <Ground />
          <World />
          <Zones vehicleRef={vehicleRef} />
          <Vehicle ref={vehicleRef} isMobile={isMobile} />
          <CameraRig vehicleRef={vehicleRef} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}

export default Experience;
