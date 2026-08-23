'use client';

import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing';
import { Color } from 'three';

const SSAO_SHADOW_COLOR = new Color('#3a2c1d');

interface EnvironmentProps {
  isMobile: boolean;
}

/**
 * Bruno Simon-style bright clay/toy lighting rig: a soft pastel sky, warm
 * directional "sunlight" casting dynamic shadows, and gentle ambient/
 * hemisphere fill so nothing reads as pitch black. Postprocessing (SSAO
 * contact shadows + a subtle bloom on emissive accents) only runs on
 * desktop — both are relatively expensive per-pixel passes.
 */
export function Environment({ isMobile }: EnvironmentProps) {
  return (
    <>
      <color attach="background" args={['#BEE3F8']} />

      <hemisphereLight args={['#FFF8E7', '#E5DDCB', 0.6]} />
      <ambientLight intensity={0.8} color="#FFF8E7" />

      <directionalLight
        castShadow={!isMobile}
        position={[30, 50, 30]}
        intensity={1.2}
        color="#FFF3D6"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0004}
      />

      <fog attach="fog" args={['#BEE3F8', 90, 260]} />

      {!isMobile && (
        <EffectComposer multisampling={0}>
          <SSAO
            radius={0.3}
            intensity={20}
            luminanceInfluence={0.4}
            color={SSAO_SHADOW_COLOR}
            worldDistanceThreshold={20}
            worldDistanceFalloff={5}
            worldProximityThreshold={1.5}
            worldProximityFalloff={0.5}
          />
          <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.3} intensity={0.5} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}
