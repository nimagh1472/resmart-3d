'use client';

import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { DubaiEnvironment } from '@/components/three/DubaiEnvironment';
import { StreetLighting } from '@/components/three/StreetLighting';
import { HeroLandmarks } from '@/components/three/HeroLandmarks';
import { SceneTimeline, IntroFade } from '@/components/three/SceneTimeline';

/**
 * Scenes 01–03 vertical slice — isolated from the production site (see
 * app/lab/cinematic-slice/page.tsx). No physics, no gameplay camera, no
 * primitive placeholder geometry for hero landmarks (see
 * HeroLandmarks.tsx). Lighting/bloom follow Phase 03's "restrained, not
 * everything glows" rule: bloom threshold is high (luminanceThreshold 0.85)
 * so only genuinely bright sources (lamp emissives, HDRI highlights) bloom.
 */
// toneMappingExposure is a renderer instance property, not a WebGLRenderer
// constructor arg — R3F's `gl` Canvas prop doesn't reliably forward it, so
// it's set imperatively here. A mild 1.15 lift (not the earlier 3x used
// only to rule out tone-mapping as the cause of Burj Khalifa's dark render
// — see HeroLandmarks.tsx's material-repair comment for the actual cause).
function ExposureSetup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
  }, [gl]);
  return null;
}

export function CinematicSlice() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 45, near: 0.1, far: 3000 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#050709']} />
      <ExposureSetup />

      {/* Restrained "moonlight" key — no sun, per Phase 03's night-lighting strategy. */}
      <directionalLight position={[60, 80, -40]} intensity={0.9} color="#a8c4ff" />
      <ambientLight intensity={0.18} />

      <Suspense fallback={null}>
        <DubaiEnvironment />
        <HeroLandmarks />
      </Suspense>

      <StreetLighting />
      <ContactShadows position={[0, 0.01, -300]} opacity={0.4} scale={200} blur={2} far={20} />

      <SceneTimeline />
      <IntroFade />

      <EffectComposer>
        <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.3} intensity={0.6} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
}
