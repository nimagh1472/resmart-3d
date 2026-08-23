'use client';

import { RigidBody } from '@react-three/rapier';
import { DUBAI_LANDMARKS } from '@/lib/pitchData';

const { BOULEVARD_OUTER_RADIUS } = DUBAI_LANDMARKS;
const CONE_COUNT = 10;
const CONE_RING_RADIUS = BOULEVARD_OUTER_RADIUS - 6;

function polar(radius: number, angle: number, y: number): [number, number, number] {
  return [radius * Math.sin(angle), y, radius * Math.cos(angle)];
}

const CONE_POSITIONS: Array<[number, number, number]> = Array.from({ length: CONE_COUNT }, (_, index) =>
  polar(CONE_RING_RADIUS, (index / CONE_COUNT) * Math.PI * 2 + 0.3, 0.45),
);

const CRATE_POSITIONS: Array<[number, number, number]> = [
  [22, 0.5, 22],
  [-22, 0.5, 22],
  [22, 0.5, -22],
  [-22, 0.5, -22],
  [32, 0.5, 0],
  [-32, 0.5, 0],
  [0, 0.5, 32],
  [0, 0.5, -32],
];

/** Bright toy-orange traffic cone, a dynamic Rapier body so a bump from the vehicle tips and scatters it. */
function TrafficCone({ position }: { position: [number, number, number] }) {
  return (
    <RigidBody
      type="dynamic"
      colliders="hull"
      position={position}
      restitution={0.4}
      friction={0.8}
      angularDamping={1.5}
      linearDamping={0.4}
      mass={2}
    >
      <mesh castShadow>
        <coneGeometry args={[0.35, 0.9, 12]} />
        <meshStandardMaterial color="#FF7A45" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[0.7, 0.08, 0.7]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.7} />
      </mesh>
    </RigidBody>
  );
}

/** Wooden crate, a dynamic Rapier body so it bounces/tumbles naturally when clipped by the vehicle. */
function WoodenCrate({ position }: { position: [number, number, number] }) {
  return (
    <RigidBody
      type="dynamic"
      colliders="cuboid"
      position={position}
      restitution={0.3}
      friction={0.9}
      angularDamping={1.2}
      linearDamping={0.3}
      mass={6}
    >
      <mesh castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#B98255" roughness={0.9} />
      </mesh>
    </RigidBody>
  );
}

/**
 * Scattered dynamic physics props (traffic cones, wooden crates) around the
 * Boulevard ring and outer play area. The vehicle itself is a fully
 * scripted kinematic body (see Vehicle.tsx) — kinematic bodies still push
 * dynamic Rapier bodies on contact, so these bounce/tumble naturally when
 * clipped without the vehicle's own motion ever being affected by them.
 */
export function TrafficObstacles() {
  return (
    <>
      {CONE_POSITIONS.map((position, index) => (
        <TrafficCone key={`cone-${index}`} position={position} />
      ))}
      {CRATE_POSITIONS.map((position, index) => (
        <WoodenCrate key={`crate-${index}`} position={position} />
      ))}
    </>
  );
}
