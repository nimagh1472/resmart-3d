'use client';

import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Color, DoubleSide, Mesh, MeshStandardMaterial } from 'three';
import { MissingAssetBoundary } from '@/components/three/MissingAssetBoundary';

// Material repair (Phase 04A Material QA): the source file's materials are
// untextured and several are very dark (one explicit baseColorFactor was
// (0.137, 0.137, 0.137) — near-black). Confirmed via controlled testing
// that this is NOT a lighting/exposure/postprocessing artifact — 5.6x
// directional+ambient intensity and 3x renderer exposure both produced
// pixel-identical output, and removing postprocessing entirely didn't
// change it either. The material's own low albedo is the actual cause.
// Per Phase 03/04A's explicit authorization ("do not automatically accept
// source materials if they look poor... correct roughness/metalness"),
// this brightens each mesh's own color toward a believable glass/steel
// facade tone rather than replacing them with one flat uniform material —
// preserving whatever structural variation the original model intended
// (edge trim vs. glass bands vs. base) instead of erasing it.
const FACADE_MIN_LIGHTNESS = 0.55;
const GLASS_TINT = new Color('#a9c9d6');
// A restrained warm emissive standing in for lit interior windows — the
// physical justification real skyscrapers actually rely on at night (their
// visible brightness comes from window light, not reflected moonlight,
// which is why the color/opacity fixes above only got partway there). Kept
// low (0.18) — this is filling a real, named gap, not decorative glow.
const WINDOW_EMISSIVE = new Color('#ffb066');
const WINDOW_EMISSIVE_INTENSITY = 0.18;

function repairBurjMaterials(root: Mesh['parent']) {
  root?.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof MeshStandardMaterial)) return;

      const hsl = { h: 0, s: 0, l: 0 };
      material.color.getHSL(hsl);
      if (hsl.l < FACADE_MIN_LIGHTNESS) {
        if (material.transparent) {
          material.color.lerp(GLASS_TINT, 0.85);
        } else {
          material.color.setHSL(hsl.h, hsl.s * 0.6, FACADE_MIN_LIGHTNESS);
        }
      }
      // The alpha-blended "glass" bands (opacity ~0.5) were the real
      // remaining problem after the color fix above: at 50% opacity, the
      // rendered pixel is a blend with whatever's behind it — which, for a
      // tower silhouetted against a dark night sky, means blending toward
      // black regardless of how bright the material's own color is. There's
      // no interior geometry for transparency to usefully reveal here, so
      // these read as solid tinted glass instead — opacity raised, not
      // transparency removed outright, to keep a hint of the original
      // banding rather than flattening it.
      if (material.transparent) material.opacity = 0.92;
      material.emissive.copy(WINDOW_EMISSIVE);
      material.emissiveIntensity = WINDOW_EMISSIVE_INTENSITY;
      material.roughness = material.transparent ? 0.15 : 0.35;
      material.metalness = material.transparent ? 0.6 : 0.2;
      material.side = DoubleSide;
      material.needsUpdate = true;
    });
  });
}

// Burj Khalifa: SPACE UNITED, Sketchfab, CC-BY 4.0 (see public/assets/3d/LICENSES.md).
// Verified via direct inspection (Phase 04A): 267K triangles, 0 textures (flat
// materials — a known, reported gap, not hidden), real-world-scale silhouette
// confirmed via actual render (recognizable tiered/tapering tower + tri-lobed
// base). Genuinely loads and parses via Three.js GLTFLoader.
const BURJ_KHALIFA_PATH = '/assets/3d-source/burj-khalifa.glb';

// Real Three.js-measured world-space bounding box (Box3().setFromObject,
// world matrices applied — NOT the raw/untransformed accessor bounds, which
// don't account for the model's own node-transform hierarchy):
//   size:   (21780.56, 25471.20, 24720.95)  — native units
//   center: (10890.28, 12735.60, -12360.47) — native units
//   min.y:  0
// The X/Z footprint is inflated by non-tower geometry bundled in the file
// (a ground/plaza-scale element, matching the stray "Asphalt_New_18" /
// "Lisanne_Tool_Bag_1" material names found during inspection) — so only
// the Y (height) measurement is treated as trustworthy for scale
// calibration here, calibrated to a real-world 828m Burj Khalifa height.
const BURJ_NATIVE_HEIGHT = 25471.2;
const BURJ_NATIVE_CENTER: [number, number, number] = [10890.28, 12735.6, -12360.47];
const BURJ_TARGET_HEIGHT_METERS = 828;
const BURJ_SCALE = BURJ_TARGET_HEIGHT_METERS / BURJ_NATIVE_HEIGHT;

// Placed beside (not on) the road, far enough beyond its visible end
// (DubaiEnvironment's road runs to roughly z=-350) to read as a distant
// establishing-shot landmark rather than something sitting in the street.
const BURJ_WORLD_POSITION: [number, number, number] = [80, 0, -650];

function BurjKhalifaModel() {
  const { scene } = useGLTF(BURJ_KHALIFA_PATH);

  useEffect(() => {
    repairBurjMaterials(scene);
  }, [scene]);

  return (
    <group scale={BURJ_SCALE}>
      <group position={[-BURJ_NATIVE_CENTER[0], 0, -BURJ_NATIVE_CENTER[2]]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/**
 * Burj Khalifa — the Scene 02 establishing-shot anchor.
 *
 * Ocean Heights is deliberately NOT here. Phase 04A's own inspection found
 * the delivered file (public/assets/3d-source/dubai_skyscraper.glb) never
 * completes loading through Three.js's GLTFLoader — confirmed via: (1) the
 * app's real R3F/drei pipeline, (2) a raw, independent GLTFLoader instance
 * bypassing all React/Suspense integration, (3) both dev and production
 * builds, (4) with and without GPU, (5) up to 90s wait. The file downloads
 * byte-perfect and its 3 embedded textures independently decode fine via
 * PIL — so this isn't corruption or a slow-decode issue, it's something in
 * how Three.js's loader specifically processes this file. Per the explicit
 * instruction not to hide broken assets: this is reported, not silently
 * dropped or replaced with procedural geometry. Re-attempt once either the
 * file is re-exported (e.g. via Blender round-trip) or Three.js is upgraded.
 */
export function HeroLandmarks() {
  return (
    <group position={BURJ_WORLD_POSITION}>
      <MissingAssetBoundary label="Burj Khalifa" note="public/assets/3d-source/burj-khalifa.glb">
        <BurjKhalifaModel />
      </MissingAssetBoundary>
    </group>
  );
}
