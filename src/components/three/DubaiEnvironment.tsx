'use client';

import { useMemo } from 'react';
import { Environment, useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';
import { NightSky } from '@/components/three/NightSky';

const HDRI_PATH = '/assets/3d/hdri/shanghai_bund_2k.hdr';
// Extended from 400->700 and recentered so the road reaches toward Burj
// Khalifa's real position (z=-650, see HeroLandmarks.tsx) instead of ending
// ~300 units short of it.
const ROAD_SIZE: [number, number] = [60, 700];
const ROAD_CENTER_Z = -300;
const SIDEWALK_OFFSET = 9;

function useTiledTexture(basePath: string, repeatX: number, repeatY: number) {
  const [diffuse, normal, arm] = useTexture([`${basePath}/diff_2k.jpg`, `${basePath}/nor_gl_2k.jpg`, `${basePath}/arm_2k.jpg`]);

  return useMemo(() => {
    [diffuse, normal, arm].forEach((tex) => {
      tex.wrapS = tex.wrapT = RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
    });
    diffuse.colorSpace = SRGBColorSpace;
    return { diffuse, normal, arm };
  }, [diffuse, normal, arm, repeatX, repeatY]);
}

function RoadSurface() {
  const { diffuse, normal, arm } = useTiledTexture('/assets/3d/textures/asphalt_06', 6, 40);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROAD_CENTER_Z]} receiveShadow>
      <planeGeometry args={ROAD_SIZE} />
      <meshStandardMaterial
        map={diffuse}
        normalMap={normal}
        aoMap={arm}
        roughnessMap={arm}
        roughness={0.75}
        metalness={0}
      />
    </mesh>
  );
}

function Sidewalk({ side }: { side: 1 | -1 }) {
  const { diffuse, normal, arm } = useTiledTexture('/assets/3d/textures/brushed_concrete', 2, 40);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[side * (ROAD_SIZE[0] / 2 + SIDEWALK_OFFSET / 2), 0.05, ROAD_CENTER_Z]}
      receiveShadow
    >
      <planeGeometry args={[SIDEWALK_OFFSET, ROAD_SIZE[1]]} />
      <meshStandardMaterial map={diffuse} normalMap={normal} aoMap={arm} roughnessMap={arm} roughness={0.85} />
    </mesh>
  );
}

/**
 * Ground plane (road + sidewalks, real Poly Haven CC0 PBR materials — see
 * LICENSES.md) plus the authored night-sky/reflection environment. This is
 * the "atmosphere enhances good geometry, never hides bad geometry"
 * principle from Phase 03: fog/haze are tuned to work WITH the road/hero
 * landmarks, not to obscure placeholder geometry (there is none — see
 * HeroLandmarks.tsx's explicit missing-asset handling instead).
 */
export function DubaiEnvironment() {
  return (
    <>
      {/*
       * background is deliberately false — QA testing found background=true
       * renders as an unmistakable, specific, WRONG location: Shanghai's
       * Bund. This HDRI is retained ONLY for its lighting/reflection
       * contribution (IBL) — per the current QA cycle's explicit
       * instruction, this must be reassessed: if its reflections/highlight
       * color don't actually suit Dubai's warm palette either, it should be
       * swapped for a neutral studio/city-generic HDRI instead. NightSky
       * below provides the actual visible sky, geographically neutral by
       * construction (a procedural gradient + stars, not a photo of
       * anywhere).
       */}
      <Environment files={HDRI_PATH} background={false} environmentIntensity={0.4} />
      <NightSky />
      {/* far extended 340->1400 so Burj Khalifa (now at real scale, z=-650) gets mild atmospheric haze rather than being fully obscured — atmosphere enhancing the hero asset, not hiding it. */}
      <fog attach="fog" args={['#0d1a22', 60, 1400]} />
      <RoadSurface />
      <Sidewalk side={1} />
      <Sidewalk side={-1} />
    </>
  );
}
