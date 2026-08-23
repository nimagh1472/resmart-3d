'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing';
import { Color, type PlaneGeometry } from 'three';
import { WORLD_BOUNDS } from '@/lib/pitchData';

/** Low-core-count devices (old phones, budget laptops) get the same "skip SSAO" treatment as mobile, even on desktop Chrome. */
function detectLowEndGpu(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
}

const SSAO_SHADOW_COLOR = new Color('#1c2b3a');

const SKY_COLOR = '#BFE0F2';
const FOG_COLOR = '#CBDCE6';
const FOG_DENSITY = 0.0016;

const WATER_POSITION: [number, number, number] = [0, -0.35, WORLD_BOUNDS.minZ - 90];
const WATER_WIDTH = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 220;
const WATER_DEPTH = 160;

/**
 * Shared glass-tower material spec (Burj-style icy curtain-wall glass) —
 * consumed by World.tsx's Building/CentralTower meshes so every skyscraper
 * in the scene reads as the same photoreal glass, not just the landmark.
 */
export const GLASS_TOWER_MATERIAL_PROPS = {
  color: '#D4F1F9',
  roughness: 0.1,
  metalness: 0.2,
  transmission: 0.85,
  thickness: 2,
  ior: 1.5,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.5,
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

      <hemisphereLight args={['#EAF4FF', '#B7C7CE', 0.55]} />
      <ambientLight intensity={0.55} color="#EAF4FF" />

      <directionalLight
        castShadow={!isMobile}
        position={[60, 100, 60]}
        intensity={1.8}
        color="#FFFBEF"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />

      <fogExp2 attach="fog" args={[FOG_COLOR, FOG_DENSITY]} />

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
            <Bloom key="bloom" luminanceThreshold={0.85} luminanceSmoothing={0.3} intensity={0.5} mipmapBlur />,
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
      <meshPhysicalMaterial
        color="#00A896"
        roughness={0.05}
        metalness={0.4}
        clearcoat={1}
        clearcoatRoughness={0.05}
        transparent
        opacity={0.85}
        envMapIntensity={1.4}
      />
    </mesh>
  );
}
