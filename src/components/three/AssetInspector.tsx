'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Grid, Environment } from '@react-three/drei';
import { Box3, Vector3 } from 'three';

interface InspectedModelProps {
  path: string;
  onMeasured: (size: Vector3) => void;
}

/**
 * Diagnostic-only viewer — NOT part of Scenes 01–03, NOT the cinematic
 * pipeline. Neutral studio lighting, no fog/bloom/night-sky. Re-centers the
 * model at the origin and reports its real bounding-box size so the camera
 * can auto-frame regardless of whether the model's native units are ~2 or
 * ~25,000 (the two provided files differ by four orders of magnitude).
 * Exists solely to visually verify what's actually inside the two provided
 * GLBs before any integration decision. Not a shipped feature.
 */
function InspectedModel({ path, onMeasured }: InspectedModelProps) {
  console.log('[inspector] InspectedModel render, path=', path);
  const { scene } = useGLTF(path);
  console.log('[inspector] useGLTF resolved, scene children=', scene.children.length);
  const [offset, setOffset] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    console.log('[inspector] effect running');
    // DIAGNOSTIC ONLY — testing the inverted-normals/backface-culling
    // hypothesis for the Ocean Heights file (renders nothing from any
    // external camera angle, no console errors). Forcing DoubleSide is not
    // a fix to ship, just a cheap way to confirm or rule this out.
    scene.traverse((child) => {
      const mesh = child as unknown as { material?: { side?: number } };
      if (mesh.material) mesh.material.side = 2; // THREE.DoubleSide
    });

    // Force world matrices up to date before measuring — computing bounds
    // on a just-parsed glTF scene before it's had a render pass can read
    // stale (identity) transforms on nested nodes.
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    const center = new Vector3();
    box.getCenter(center);
    console.log('[inspector] measured size=', size.toArray(), 'center=', center.toArray(), 'min=', box.min.toArray());
    setOffset([-center.x, -box.min.y, -center.z]);
    onMeasured(size);
  }, [scene, onMeasured]);

  return (
    <group position={offset}>
      <primitive object={scene} />
    </group>
  );
}

// No OrbitControls here on purpose — this tool only ever needs a static
// screenshot (headless capture), and drei's OrbitControls fights any
// imperative camera positioning once mounted (it re-derives camera
// position/rotation from its own internal spherical state every frame,
// which was silently overriding this component's framing). Driving
// position + lookAt unconditionally every frame via useFrame instead
// guarantees this component always wins.
function FrameOnModel({ size }: { size: Vector3 | null }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!size) return;
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.6;
    camera.position.set(distance * 0.6, size.y / 2 + distance * 0.25, distance * 0.6);
    camera.near = maxDim / 1000;
    camera.far = maxDim * 20;
    camera.updateProjectionMatrix();
    camera.lookAt(0, size.y / 2, 0);
  });

  return null;
}

export function AssetInspector({ path }: { path: string }) {
  const [size, setSize] = useState<Vector3 | null>(null);

  return (
    <Canvas camera={{ fov: 50, near: 0.01, far: 1000000 }}>
      <color attach="background" args={['#2a2a2e']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} />
      <Environment preset="studio" />
      <Suspense fallback={null}>
        <InspectedModel path={path} onMeasured={setSize} />
      </Suspense>
      <FrameOnModel size={size} />
      <Grid args={[1000, 100]} />
    </Canvas>
  );
}
