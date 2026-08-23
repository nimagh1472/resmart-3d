'use client';

import { forwardRef, useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { controlsState } from '@/hooks/useKeyboardControls';
import { useRoleStore } from '@/hooks/useRoleStore';
import { vehicleTelemetry } from '@/hooks/useVehicleTelemetry';
import { DUBAI_LANDMARKS, WORLD_BOUNDS } from '@/lib/pitchData';

const [TOWER_X, , TOWER_Z] = DUBAI_LANDMARKS.CENTRAL_TOWER_POSITION;
const TOWER_EXCLUSION_RADIUS = DUBAI_LANDMARKS.CENTRAL_TOWER_EXCLUSION_RADIUS;

const MAX_SPEED = 18; // units/sec
const BOOST_MULTIPLIER = 1.6;
const TURN_RATE = 2.2; // rad/sec, at a standstill — see speed-dependent falloff below
const TURN_RATE_FALLOFF_AT_TOP_SPEED = 0.4; // fraction of TURN_RATE shed at MAX_SPEED (stability at speed)
const VEHICLE_HALF_WIDTH = 1.5;
// Caps how far a single frame can move the vehicle, regardless of a lag
// spike or the tab regaining focus after being backgrounded (both produce an
// abnormally large useFrame delta). Without this, position integration is
// purely sampled (not swept), so an oversized single-frame step can tunnel
// straight through the Central Tower's exclusion radius below instead of
// being clamped at its edge.
const MAX_FRAME_DELTA = 1 / 15;
const SPAWN_HEIGHT = 0.6;
// The Central Tower now occupies world origin (see World.tsx/pitchData.ts
// DUBAI_LANDMARKS), so the vehicle spawns on the boulevard just south of it.
const SPAWN_POSITION: [number, number, number] = [0, SPAWN_HEIGHT, 40];

// Smoothing rates (per second) for the "premium" lerp-driven feel: how
// quickly current speed/turn converge toward the raw input target, and how
// quickly the purely-visual body-roll/pitch tilt converges toward its target.
// Braking/lift-off responds noticeably snappier than accelerating ramps up —
// the asymmetry arcade driving games use to feel responsive under braking
// without making acceleration feel twitchy.
const ACCEL_RESPONSE = 3.4;
const BRAKE_RESPONSE = 8;
const TURN_RESPONSE = 6;
const TILT_RESPONSE = 5;
const MAX_ROLL = 0.22; // radians of bank into a turn
const MAX_PITCH = 0.09; // radians of nose dip/lift under accel/brake

// Drift dust kicks in once the car is moving fast AND steering hard —
// exactly the "fast steering change at speed" moment a drift reads as.
const DRIFT_SPEED_THRESHOLD = 0.35; // fraction of top speed
const DRIFT_RESPONSE = 6;
const DUST_PARTICLE_COUNT = 24;

// THREE.MathUtils.damp: the built-in framerate-independent exponential
// approach of `current` toward `target` at rate `response`, over `delta`
// seconds — used for every smoothed value below instead of a raw per-frame
// lerp, so speed/turn/tilt easing stays consistent across framerates.
const damp = THREE.MathUtils.damp;

interface VehicleProps {
  isMobile: boolean;
}

/**
 * Kinematic vehicle: a RigidBody of type "kinematicPosition" whose transform
 * is set directly every frame via setNextKinematicTranslation/Rotation
 * rather than being driven by forces or torque. This is the fix for the
 * tipping/clipping/tunneling/uncontrolled-rotation failure modes a
 * force-integrated ("dynamic") vehicle body would be prone to — the body's
 * transform is fully authoritative, never derived from physics integration.
 *
 * Built entirely from procedural primitives (no .gltf/.glb assets). Inputs
 * are ignored while presentationMode is CINEMATIC, and the rendered mesh
 * switches between the Customer City Car and the Agent Scooter based on
 * activeRole.
 */
export const Vehicle = forwardRef<RapierRigidBody, VehicleProps>(function Vehicle({ isMobile }, ref) {
  const activeRole = useRoleStore((state) => state.activeRole);
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const speedBoostMultiplier = useRoleStore((state) => state.speedBoostMultiplier);

  // A plain useImperativeHandle snapshot of rigidBodyRef.current can go
  // stale here: @react-three/rapier assigns the RapierRigidBody instance to
  // <RigidBody ref>'s callback on its own timing (physics-world-ready, not
  // React's commit), and Vehicle has no reason to re-render again afterward
  // to refresh an imperative-handle snapshot. Merging the forwarded ref into
  // the SAME callback RigidBody itself calls guarantees CameraRig/Zones see
  // the instance at the exact moment it actually becomes available.
  const rigidBodyRef = useRef<RapierRigidBody | null>(null);
  const setRigidBodyRef = useCallback(
    (instance: RapierRigidBody | null) => {
      rigidBodyRef.current = instance;
      if (typeof ref === 'function') ref(instance);
      else if (ref) ref.current = instance;
    },
    [ref],
  );

  const position = useRef(new THREE.Vector3(...SPAWN_POSITION));
  const rotationY = useRef(0);
  const quaternion = useRef(new THREE.Quaternion());
  const upAxis = useRef(new THREE.Vector3(0, 1, 0));

  // Smoothed (lerped) speed/turn so accel/steering ease in rather than
  // snapping instantly to raw input, plus a purely-visual tilt group (body
  // roll into turns, suspension pitch under accel/braking) layered on top of
  // the flat kinematic transform the RigidBody/collider actually uses.
  const currentSpeed = useRef(0);
  const previousSpeed = useRef(0);
  const currentTurnRate = useRef(0);
  const currentRoll = useRef(0);
  const currentPitch = useRef(0);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const driftIntensity = useRef(0);

  useFrame((_, rawDelta) => {
    const rigidBody = rigidBodyRef.current;
    if (!rigidBody) return;

    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);

    const inputEnabled = presentationMode !== 'CINEMATIC';
    const forwardInput = inputEnabled ? controlsState.forward : 0;
    const turnInput = inputEnabled ? controlsState.turn : 0;
    const boost = inputEnabled && controlsState.boost;

    const targetSpeed = forwardInput * MAX_SPEED * speedBoostMultiplier * (boost ? BOOST_MULTIPLIER : 1);

    // Braking curve: easing off/reversing converges toward the (lower)
    // target speed noticeably faster than accelerating ramps up toward it.
    const isBraking = Math.abs(targetSpeed) < Math.abs(currentSpeed.current) - 0.01;
    const speedResponse = isBraking ? BRAKE_RESPONSE : ACCEL_RESPONSE;

    // Speed-dependent steering: tight and agile at low speed, progressively
    // more stable (less twitchy) as the car approaches top speed.
    const speedFactor = THREE.MathUtils.clamp(Math.abs(currentSpeed.current) / (MAX_SPEED * BOOST_MULTIPLIER), 0, 1);
    const effectiveTurnRate = TURN_RATE * (1 - speedFactor * TURN_RATE_FALLOFF_AT_TOP_SPEED);
    const targetTurnRate = turnInput * effectiveTurnRate * (forwardInput < 0 ? -1 : 1);
    const turnMagnitude = Math.abs(turnInput);

    previousSpeed.current = currentSpeed.current;
    currentSpeed.current = damp(currentSpeed.current, targetSpeed, speedResponse, delta);
    currentTurnRate.current = damp(currentTurnRate.current, targetTurnRate, TURN_RESPONSE, delta);

    rotationY.current += currentTurnRate.current * delta;

    let nextX = position.current.x + Math.sin(rotationY.current) * currentSpeed.current * delta;
    let nextZ = position.current.z + Math.cos(rotationY.current) * currentSpeed.current * delta;

    // The vehicle is a fully scripted kinematic body — Rapier never adjusts
    // its position for us, so the Central Tower "collider" in World.tsx is
    // purely visual. This manual radial push-out (matching the WORLD_BOUNDS
    // clamp just below) is what actually stops the car from driving through
    // the tower at the middle of the boulevard roundabout.
    const towerDx = nextX - TOWER_X;
    const towerDz = nextZ - TOWER_Z;
    const towerDistSq = towerDx * towerDx + towerDz * towerDz;
    if (towerDistSq < TOWER_EXCLUSION_RADIUS * TOWER_EXCLUSION_RADIUS) {
      const towerDist = Math.sqrt(towerDistSq) || 1;
      nextX = TOWER_X + (towerDx / towerDist) * TOWER_EXCLUSION_RADIUS;
      nextZ = TOWER_Z + (towerDz / towerDist) * TOWER_EXCLUSION_RADIUS;
    }

    position.current.x = Math.min(
      WORLD_BOUNDS.maxX - VEHICLE_HALF_WIDTH,
      Math.max(WORLD_BOUNDS.minX + VEHICLE_HALF_WIDTH, nextX),
    );
    position.current.z = Math.min(
      WORLD_BOUNDS.maxZ - VEHICLE_HALF_WIDTH,
      Math.max(WORLD_BOUNDS.minZ + VEHICLE_HALF_WIDTH, nextZ),
    );

    quaternion.current.setFromAxisAngle(upAxis.current, rotationY.current);

    rigidBody.setNextKinematicTranslation(position.current);
    rigidBody.setNextKinematicRotation(quaternion.current);

    vehicleTelemetry.x = position.current.x;
    vehicleTelemetry.z = position.current.z;

    // Visual-only body-roll (bank into turns) and suspension pitch (nose
    // dips under acceleration, lifts under braking) — never touches the
    // RigidBody transform above, so collision bounds stay flat/predictable.
    const targetRoll = THREE.MathUtils.clamp(-currentTurnRate.current / TURN_RATE, -1, 1) * MAX_ROLL;
    const speedDelta = delta > 0 ? (currentSpeed.current - previousSpeed.current) / delta : 0;
    const targetPitch = THREE.MathUtils.clamp(-speedDelta / (MAX_SPEED * BOOST_MULTIPLIER), -1, 1) * MAX_PITCH;

    currentRoll.current = damp(currentRoll.current, targetRoll, TILT_RESPONSE, delta);
    currentPitch.current = damp(currentPitch.current, targetPitch, TILT_RESPONSE, delta);

    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.z = currentRoll.current;
      tiltGroupRef.current.rotation.x = currentPitch.current;
    }

    // Drift dust: a fast steering change only reads as a "drift" once the
    // car has real speed behind it — gated on speedFactor, driven by how
    // hard the (speed-falloff-adjusted) turn rate is currently being pushed.
    const targetDrift = speedFactor > DRIFT_SPEED_THRESHOLD ? THREE.MathUtils.clamp(turnMagnitude, 0, 1) : 0;
    driftIntensity.current = damp(driftIntensity.current, targetDrift, DRIFT_RESPONSE, delta);
  });

  const isAgent = activeRole === 'AGENT';

  return (
    <RigidBody ref={setRigidBodyRef} type="kinematicPosition" colliders={false} position={SPAWN_POSITION}>
      <CuboidCollider args={[1.1, 0.6, 1.9]} />
      <group ref={tiltGroupRef}>
        {isAgent ? <AgentScooter isMobile={isMobile} /> : <CustomerCityCar isMobile={isMobile} />}
        <DriftDust intensityRef={driftIntensity} />
      </group>
    </RigidBody>
  );
});

/**
 * Rear-mounted tire dust: a shared-material instanced puff cloud whose
 * opacity/scale track driftIntensity (set in the parent Vehicle's useFrame)
 * and whose per-particle offsets drift outward/upward over time via a
 * simple looping phase — cheap enough to run every frame with no allocation.
 */
function DriftDust({ intensityRef }: { intensityRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: DUST_PARTICLE_COUNT }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: 0.3 + Math.random() * 1.2,
        speed: 0.5 + Math.random() * 0.7,
        phase: Math.random(),
      })),
    [],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const intensity = THREE.MathUtils.clamp(intensityRef.current, 0, 1);
    if (materialRef.current) materialRef.current.opacity = intensity * 0.5;
    mesh.visible = intensity > 0.02;
    if (!mesh.visible) return;

    const t = state.clock.elapsedTime;
    seeds.forEach((seed, index) => {
      const cycle = (t * seed.speed + seed.phase) % 1;
      const spread = seed.radius * (0.6 + intensity * 0.8);
      dummy.position.set(Math.sin(seed.angle) * spread * cycle, 0.15 + cycle * 0.6, -1.9 - cycle * 2.4);
      dummy.scale.setScalar((0.12 + intensity * 0.22) * (0.4 + cycle));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, DUST_PARTICLE_COUNT]} visible={false}>
      <sphereGeometry args={[0.4, 6, 6]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#D9C4A0"
        transparent
        opacity={0}
        depthWrite={false}
        roughness={1}
      />
    </instancedMesh>
  );
}

interface VehicleMeshProps {
  isMobile: boolean;
}

/** Customer City Car: a compact sedan silhouette in ReSmart blue. */
function CustomerCityCar({ isMobile }: VehicleMeshProps) {
  return (
    <>
      <mesh castShadow={!isMobile} position={[0, 0.4, 0]}>
        <boxGeometry args={[2, 0.8, 3.6]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      <mesh castShadow={!isMobile} position={[0, 0.95, -0.3]}>
        <boxGeometry args={[1.6, 0.6, 1.6]} />
        <meshStandardMaterial color="#0b1d63" />
      </mesh>
      {[
        [1, 0.1, 1.2],
        [-1, 0.1, 1.2],
        [1, 0.1, -1.2],
        [-1, 0.1, -1.2],
      ].map((wheelPosition, index) => (
        <mesh
          key={index}
          castShadow={!isMobile}
          position={wheelPosition as [number, number, number]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}

      {[
        [0.65, 0.4, 1.82],
        [-0.65, 0.4, 1.82],
      ].map((lightPosition, index) => (
        <mesh key={`headlight-${index}`} position={lightPosition as [number, number, number]}>
          <boxGeometry args={[0.3, 0.15, 0.05]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
      {[
        [0.65, 0.4, -1.82],
        [-0.65, 0.4, -1.82],
      ].map((lightPosition, index) => (
        <mesh key={`taillight-${index}`} position={lightPosition as [number, number, number]}>
          <boxGeometry args={[0.3, 0.15, 0.05]} />
          <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}

      {isMobile && <ContactShadows position={[0, -0.55, 0]} opacity={0.6} blur={2} scale={6} far={2} />}
    </>
  );
}

/** Agent Scooter: a compact two-wheel delivery scooter in ReSmart green. */
function AgentScooter({ isMobile }: VehicleMeshProps) {
  return (
    <>
      {/* deck */}
      <mesh castShadow={!isMobile} position={[0, 0.25, 0]}>
        <boxGeometry args={[0.7, 0.15, 2.6]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
      {/* steering column */}
      <mesh castShadow={!isMobile} position={[0, 0.9, 1.15]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.12, 1.3, 0.12]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* handlebar */}
      <mesh castShadow={!isMobile} position={[0, 1.45, 1.4]}>
        <boxGeometry args={[0.9, 0.1, 0.1]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* footboard rider platform accent */}
      <mesh position={[0, 0.34, -0.2]}>
        <boxGeometry args={[0.6, 0.02, 1.2]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* wheels */}
      {[
        [0, 0.35, 1.3],
        [0, 0.35, -1.3],
      ].map((wheelPosition, index) => (
        <mesh
          key={index}
          castShadow={!isMobile}
          position={wheelPosition as [number, number, number]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
      {/* headlight */}
      <mesh position={[0, 1.1, 1.42]}>
        <boxGeometry args={[0.3, 0.12, 0.05]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* taillight */}
      <mesh position={[0, 0.4, -1.32]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {isMobile && <ContactShadows position={[0, -0.25, 0]} opacity={0.5} blur={2} scale={4} far={2} />}
    </>
  );
}
