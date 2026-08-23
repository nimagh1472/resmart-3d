'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, SSAO, Bloom, Vignette } from '@react-three/postprocessing';
import { Environment as EnvironmentHDRI, MeshReflectorMaterial } from '@react-three/drei';
import { Color, type PlaneGeometry } from 'three';
import { WORLD_BOUNDS } from '@/lib/pitchData';

/** Low-core-count devices (old phones, budget laptops) get the same "skip SSAO" treatment as mobile, even on desktop Chrome. */
function detectLowEndGpu(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
}

const SSAO_SHADOW_COLOR = new Color('#1c2b3a');

const SKY_COLOR = '#a8d5e8';
const FOG_COLOR = '#a8d5e8';
const FOG_NEAR = 40;
const FOG_FAR = 220;

const WATER_POSITION: [number, number, number] = [0, -0.35, WORLD_BOUNDS.minZ - 90];
const WATER_WIDTH = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 220;
const WATER_DEPTH = 160;

/**
 * Hero-landmark glass material spec (Burj Khalifa + the 3-5 main towers) —
 * real transmission/refraction so these read as photoreal glass. Reserved
 * for the Central Tower and Mall District towers; background/filler
 * buildings use BACKGROUND_BUILDING_MATERIAL_PROPS instead since transmission
 * is expensive to render across dozens of repeated instances.
 */
export const GLASS_TOWER_MATERIAL_PROPS = {
  color: '#D4F1F9',
  roughness: 0.08,
  transmission: 0.95,
  thickness: 2.5,
  ior: 1.5,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  envMapIntensity: 1.8,
  attenuationColor: '#4fc8ff',
  attenuationDistance: 5,
} as const;

/**
 * Background/filler building material spec — opaque metallic glass look
 * (no transmission) for the repeated skyline buildings ringing WORLD_BOUNDS.
 */
export const BACKGROUND_BUILDING_MATERIAL_PROPS = {
  color: '#D4F1F9',
  metalness: 0.9,
  roughness: 0.15,
  envMapIntensity: 1.2,
} as const;

interface EnvironmentProps {
  isMobile: boolean;
}

/**
 * Photorealistic Downtown Dubai lighting rig: a bright coastal-blue sky,
 * crisp high-resolution sunlight casting dynamic shadows, subtle atmospheric
 * fog matching the sky color, and a rippling coastal water plane standing in
 * for Dubai Creek/the waterfront beyond the drivable area. Postprocessing
 * (SSAO contact shadows + bloom on emissive/glass accents) only runs on
 * desktop — both are relatively expensive per-pixel passes.
 */
export function Environment({ isMobile }: EnvironmentProps) {
  const isLowEnd = useMemo(() => isMobile || detectLowEndGpu(), [isMobile]);

  return (
    <>
      <color attach="background" args={[SKY_COLOR]} />

      <EnvironmentHDRI preset="city" background={false} />
      <hemisphereLight args={['#bde3ff', '#3a2f28', 0.5]} />

      <directionalLight
        castShadow={!isMobile}
        position={[50, 80, 30]}
        intensity={2.2}
        color="#FFFBEF"
        shadow-mapSize={isMobile ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />

      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />

      <CoastalWater isMobile={isMobile} />

      {!isMobile &&
        (() => {
          const effects = [
            !isLowEnd && (
              <SSAO
                key="ssao"
                radius={0.3}
                intensity={20}
                luminanceInfluence={0.4}
                color={SSAO_SHADOW_COLOR}
                worldDistanceThreshold={20}
                worldDistanceFalloff={5}
                worldProximityThreshold={1.5}
                worldProximityFalloff={0.5}
              />
            ),
            <Bloom key="bloom" luminanceThreshold={0.25} luminanceSmoothing={0.9} intensity={0.9} mipmapBlur />,
            <Vignette key="vignette" darkness={0.6} />,
          ].filter((effect): effect is JSX.Element => Boolean(effect));

          return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
        })()}
    </>
  );
}

/**
 * Dubai Creek/waterfront stand-in beyond the drivable WORLD_BOUNDS: a large
 * plane whose vertices are rippled with layered sine waves each frame (CPU
 * displacement, cheap at this segment count) for a realistic rolling-water
 * look, with a glassy low-roughness material to pick up sky/sun reflections.
 * Segment density (and the ripple animation itself) is reduced on mobile to
 * keep the per-frame vertex loop cheap on weaker GPUs/CPUs.
 */
function CoastalWater({ isMobile }: { isMobile: boolean }) {
  const geometryRef = useRef<PlaneGeometry>(null);
  const basePositions = useRef<Float32Array | null>(null);
  const segments = isMobile ? 16 : 56;

  useFrame((state) => {
    if (isMobile) return;
    const geometry = geometryRef.current;
    if (!geometry) return;

    if (!basePositions.current) {
      basePositions.current = Float32Array.from(geometry.attributes.position.array);
    }

    const position = geometry.attributes.position;
    const base = basePositions.current;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < position.count; i += 1) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const wave =
        Math.sin(x * 0.06 + t * 0.9) * 0.4 + Math.cos(y * 0.08 + t * 0.6) * 0.3 + Math.sin((x + y) * 0.04 + t * 0.4) * 0.2;
      position.setZ(i, wave);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh position={WATER_POSITION} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry ref={geometryRef} args={[WATER_WIDTH, WATER_DEPTH, segments, segments]} />
      {isMobile ? (
        <meshStandardMaterial color="#0a3b42" roughness={0.15} metalness={0.4} transparent opacity={0.85} />
      ) : (
        <MeshReflectorMaterial
          mirror={0.5}
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={0.15}
          color="#0a3b42"
          metalness={0.4}
        />
      )}
    </mesh>
  );
}
