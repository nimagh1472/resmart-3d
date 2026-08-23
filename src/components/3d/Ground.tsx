'use client';

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Grid } from '@react-three/drei';
import { WORLD_BOUNDS } from '@/lib/pitchData';

const WIDTH = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
const DEPTH = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
const HALF_WIDTH = WIDTH / 2;
const HALF_DEPTH = DEPTH / 2;

const WALL_HEIGHT = 14;
const WALL_THICKNESS = 2;

/**
 * Physics-enabled ground sized exactly to WORLD_BOUNDS, with invisible
 * fixed-body walls at each edge as a physics-level backstop against the
 * vehicle's own manual clamp (see Vehicle.tsx).
 */
export function Ground() {
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid" friction={1}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[WIDTH, DEPTH]} />
          <meshStandardMaterial color="#E5DDCB" roughness={0.95} metalness={0} />
        </mesh>
      </RigidBody>

      <Grid
        position={[0, 0.01, 0]}
        args={[WIDTH, DEPTH]}
        cellSize={4}
        cellThickness={0.5}
        cellColor="#C9BFA0"
        sectionSize={20}
        sectionThickness={1.2}
        sectionColor="#E08E68"
        fadeDistance={160}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Invisible bounding walls, one per edge of WORLD_BOUNDS */}
      <RigidBody type="fixed" position={[0, WALL_HEIGHT / 2, WORLD_BOUNDS.minZ]}>
        <CuboidCollider args={[HALF_WIDTH, WALL_HEIGHT / 2, WALL_THICKNESS / 2]} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, WALL_HEIGHT / 2, WORLD_BOUNDS.maxZ]}>
        <CuboidCollider args={[HALF_WIDTH, WALL_HEIGHT / 2, WALL_THICKNESS / 2]} />
      </RigidBody>
      <RigidBody type="fixed" position={[WORLD_BOUNDS.minX, WALL_HEIGHT / 2, 0]}>
        <CuboidCollider args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, HALF_DEPTH]} />
      </RigidBody>
      <RigidBody type="fixed" position={[WORLD_BOUNDS.maxX, WALL_HEIGHT / 2, 0]}>
        <CuboidCollider args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, HALF_DEPTH]} />
      </RigidBody>
    </>
  );
}
