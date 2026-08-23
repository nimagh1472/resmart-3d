'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import confetti from 'canvas-confetti';
import * as THREE from 'three';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useSound } from '@/hooks/useSound';
import { DUBAI_LANDMARKS } from '@/lib/pitchData';
import { FacingText } from '@/components/3d/FacingText';

const { BOULEVARD_OUTER_RADIUS, MALL_DISTRICT_CENTER } = DUBAI_LANDMARKS;
const CONE_COUNT = 14;
const CONE_RING_RADIUS = BOULEVARD_OUTER_RADIUS - 6;

// Tags a dynamic RigidBody as something Vehicle.tsx's onCollisionEnter should
// treat as a "crash" (procedural impact sound) rather than a silent contact
// against Ground/walls/fixed ramps.
const OBSTACLE_USER_DATA = { obstacle: true } as const;

function polar(radius: number, angle: number, y: number): [number, number, number] {
  return [radius * Math.sin(angle), y, radius * Math.cos(angle)];
}

const CONE_POSITIONS: Array<[number, number, number]> = Array.from({ length: CONE_COUNT }, (_, index) =>
  polar(CONE_RING_RADIUS, (index / CONE_COUNT) * Math.PI * 2 + 0.3, 0.45),
);

// Base (x, z) footprint for each crate stack; CrateStack renders CRATES_PER_STACK
// individually-physical crates on top of one another at each position so a
// bump scatters the whole tower crate-by-crate instead of as one rigid block.
const CRATE_STACK_POSITIONS: Array<[number, number]> = [
  [22, 22],
  [-22, 22],
  [22, -22],
  [-22, -22],
  [32, 0],
  [-32, 0],
  [0, 32],
  [0, -32],
];
const CRATES_PER_STACK = 2;

interface BillboardObstacleConfig {
  position: [number, number, number];
  rotationY: number;
  label: string;
  color: string;
}

const KNOCKABLE_BILLBOARDS: BillboardObstacleConfig[] = [
  { position: [10, 0, 4], rotationY: Math.PI * 0.5, label: 'ReSmart AI', color: '#FF8FA3' },
  { position: [-10, 0, -4], rotationY: -Math.PI * 0.5, label: 'DRIVE SMART', color: '#8CE99A' },
  { position: [4, 0, 20], rotationY: 0, label: 'RESMART', color: '#7dd3fc' },
  { position: [-4, 0, -20], rotationY: Math.PI, label: 'GET REWARDED', color: '#facc15' },
];

export interface RampConfig {
  /** Footprint base-center, at ground level. */
  position: [number, number, number];
  /** Climb direction, using the same sin(angle)/cos(angle) heading convention Vehicle.tsx uses for the vehicle itself. */
  rotationY: number;
  length: number;
  width: number;
  rampHeight: number;
}

/** Stunt ramps flanking the Dubai Mall district — see Vehicle.tsx's ramp-launch physics. */
export const RAMP_CONFIGS: RampConfig[] = [
  {
    position: [MALL_DISTRICT_CENTER[0] - 26, 0, MALL_DISTRICT_CENTER[2] - 4],
    rotationY: -Math.PI / 2,
    length: 9,
    width: 4.4,
    rampHeight: 2.8,
  },
  {
    position: [MALL_DISTRICT_CENTER[0] + 6, 0, MALL_DISTRICT_CENTER[2] + 30],
    rotationY: Math.PI,
    length: 9,
    width: 4.4,
    rampHeight: 2.8,
  },
];

// Golden gem sits just past the lip of the first ramp — reachable by driving
// up it (or simply approaching, matching CashbackPickup's XZ-only trigger).
const GEM_RAMP = RAMP_CONFIGS[0];
const GEM_TRIGGER_RADIUS = 3.4;
const GEM_POSITION: [number, number, number] = [
  GEM_RAMP.position[0] + Math.sin(GEM_RAMP.rotationY) * (GEM_RAMP.length + 1.5),
  GEM_RAMP.rampHeight + 2.2,
  GEM_RAMP.position[2] + Math.cos(GEM_RAMP.rotationY) * (GEM_RAMP.length + 1.5),
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
      mass={1}
      userData={OBSTACLE_USER_DATA}
    >
      <mesh castShadow={false}>
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
      restitution={0.4}
      friction={0.9}
      angularDamping={1.2}
      linearDamping={0.3}
      mass={1}
      userData={OBSTACLE_USER_DATA}
    >
      <mesh castShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#B98255" roughness={0.9} />
      </mesh>
    </RigidBody>
  );
}

/** A vertical stack of independently-physical crates at one (x, z) footprint — each one its own RigidBody so a hit scatters them individually rather than toppling one rigid tower. */
function CrateStack({ baseX, baseZ }: { baseX: number; baseZ: number }) {
  return (
    <>
      {Array.from({ length: CRATES_PER_STACK }, (_, level) => (
        <WoodenCrate key={level} position={[baseX, 0.55 + level * 1.05, baseZ]} />
      ))}
    </>
  );
}

/** Knockable ReSmart billboard: a signpost + panel, dynamic so it topples and scatters when clipped. */
function KnockableBillboard({ position, rotationY, label, color }: BillboardObstacleConfig) {
  return (
    <RigidBody
      type="dynamic"
      colliders="cuboid"
      position={position}
      rotation={[0, rotationY, 0]}
      restitution={0.4}
      friction={0.7}
      angularDamping={0.9}
      linearDamping={0.25}
      mass={1}
      userData={OBSTACLE_USER_DATA}
    >
      <mesh castShadow={false} position={[0, 2.6, 0]}>
        <boxGeometry args={[0.22, 5.2, 0.22]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh castShadow={false} position={[0, 5.4, 0]}>
        <boxGeometry args={[3.2, 1.7, 0.15]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <FacingText position={[0, 5.4, 0.11]} fontSize={0.42} color="#0b1120" anchorX="center" anchorY="middle" maxWidth={2.8}>
        {label}
      </FacingText>
    </RigidBody>
  );
}

/**
 * Fixed-body stunt ramp: a tilted wedge the vehicle can visually drive up.
 * The vehicle is a fully scripted kinematic body (see Vehicle.tsx) — it never
 * reacts to Rapier contact forces on itself, so the actual mid-air launch
 * physics are computed manually in Vehicle.tsx from this same RAMP_CONFIGS
 * geometry. This collider exists so dynamic obstacles (cones/crates/other
 * cars) rest on the ramp surface correctly rather than clipping through it.
 */
function StuntRamp({ position, rotationY, length, width, rampHeight }: RampConfig) {
  const incline = Math.atan2(rampHeight, length);
  const slopeLength = Math.sqrt(length * length + rampHeight * rampHeight);

  return (
    <RigidBody type="fixed" position={position} rotation={[0, rotationY, 0]} colliders={false}>
      <mesh
        position={[0, (rampHeight / 2) * 0.55, length / 2]}
        rotation={[-incline, 0, 0]}
        castShadow={false}
        receiveShadow
      >
        <boxGeometry args={[width, 0.5, slopeLength]} />
        <meshStandardMaterial color="#312e81" roughness={0.5} metalness={0.2} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[(side * width) / 2, (rampHeight / 2) * 0.55 + 0.28, length / 2]}
          rotation={[-incline, 0, 0]}
        >
          <boxGeometry args={[0.1, 0.08, slopeLength]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}
      <CuboidCollider
        args={[width / 2, 0.3, slopeLength / 2]}
        position={[0, (rampHeight / 2) * 0.55, length / 2]}
        rotation={[-incline, 0, 0]}
      />
    </RigidBody>
  );
}

/**
 * Hidden Easter Egg: a spinning golden gem atop the first stunt ramp's lip.
 * Reaching it (proximity check, matching CashbackPickup's XZ-only trigger)
 * fires a gold confetti burst, a pickup chime, and permanently unlocks the
 * DUBAI_VIP50 secret voucher code via useRoleStore.unlockEasterEgg.
 */
function EasterEggGem({ vehicleRef }: { vehicleRef: React.RefObject<RapierRigidBody> }) {
  const spinRef = useRef<THREE.Group>(null);
  const hasFoundEasterEgg = useRoleStore((state) => state.hasFoundEasterEgg);
  const unlockEasterEgg = useRoleStore((state) => state.unlockEasterEgg);
  const { playChime } = useSound();

  useFrame((state) => {
    if (spinRef.current) {
      spinRef.current.rotation.y += 0.03;
      spinRef.current.position.y = GEM_POSITION[1] + Math.sin(state.clock.elapsedTime * 2.2) * 0.3;
    }

    if (hasFoundEasterEgg) return;
    const vehicle = vehicleRef.current;
    if (!vehicle) return;

    const translation = vehicle.translation();
    const dx = translation.x - GEM_POSITION[0];
    const dz = translation.z - GEM_POSITION[2];
    if (Math.sqrt(dx * dx + dz * dz) <= GEM_TRIGGER_RADIUS) {
      unlockEasterEgg();
      playChime();
      confetti({
        particleCount: 220,
        spread: 100,
        startVelocity: 45,
        origin: { y: 0.5 },
        colors: ['#facc15', '#fde047', '#f59e0b', '#fff7ed'],
      });
    }
  });

  if (hasFoundEasterEgg) return null;

  return (
    <group position={[GEM_POSITION[0], 0, GEM_POSITION[2]]}>
      <group ref={spinRef} position={[0, GEM_POSITION[1], 0]}>
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <octahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial
            color="#facc15"
            emissive="#facc15"
            emissiveIntensity={3}
            toneMapped={false}
            metalness={0.7}
            roughness={0.1}
          />
        </mesh>
        {/* No pointLight: real-time point lights are capped scene-wide at 2
            (see Experience.tsx/Vehicle.tsx) — the emissive gem already glows
            under Environment.tsx's Bloom pass. */}
      </group>
      <FacingText position={[0, GEM_POSITION[1] + 1.1, 0]} fontSize={0.4} color="#facc15" anchorX="center" anchorY="middle">
        SECRET GEM
      </FacingText>
    </group>
  );
}

interface TrafficObstaclesProps {
  vehicleRef: React.RefObject<RapierRigidBody>;
}

/**
 * Scattered dynamic physics props (traffic cones, crate stacks, knockable
 * billboards) around the Boulevard ring and outer play area, plus two fixed
 * stunt ramps near the Dubai Mall district and a hidden golden gem Easter
 * Egg atop the first ramp. The vehicle itself is a fully scripted kinematic
 * body (see Vehicle.tsx) — kinematic bodies still push dynamic Rapier bodies
 * on contact, so these bounce/tumble/topple naturally when clipped without
 * the vehicle's own motion ever being affected by them.
 */
export function TrafficObstacles({ vehicleRef }: TrafficObstaclesProps) {
  return (
    <>
      {CONE_POSITIONS.map((position, index) => (
        <TrafficCone key={`cone-${index}`} position={position} />
      ))}
      {CRATE_STACK_POSITIONS.map(([x, z], index) => (
        <CrateStack key={`crate-stack-${index}`} baseX={x} baseZ={z} />
      ))}
      {KNOCKABLE_BILLBOARDS.map((billboard, index) => (
        <KnockableBillboard key={`billboard-${index}`} {...billboard} />
      ))}
      {RAMP_CONFIGS.map((ramp, index) => (
        <StuntRamp key={`ramp-${index}`} {...ramp} />
      ))}
      <EasterEggGem vehicleRef={vehicleRef} />
    </>
  );
}
