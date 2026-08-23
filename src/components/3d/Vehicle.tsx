'use client';

import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, type RapierRigidBody, type CollisionEnterPayload } from '@react-three/rapier';
import { ContactShadows, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { controlsState } from '@/hooks/useKeyboardControls';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useSound } from '@/hooks/useSound';
import { vehicleTelemetry } from '@/hooks/useVehicleTelemetry';
import { impactShake } from '@/hooks/useImpactShake';
import { DUBAI_LANDMARKS, WORLD_BOUNDS } from '@/lib/pitchData';
import { RAMP_CONFIGS } from '@/components/3d/TrafficObstacles';

const [TOWER_X, , TOWER_Z] = DUBAI_LANDMARKS.CENTRAL_TOWER_POSITION;
const TOWER_EXCLUSION_RADIUS = DUBAI_LANDMARKS.CENTRAL_TOWER_EXCLUSION_RADIUS;

const MAX_SPEED = 18; // units/sec
const BOOST_MULTIPLIER = 1.8;
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

// Nitro boost cyan wheel-trail intensity response, and the min cooldown
// between "crash" impact sounds so scraping an obstacle for several frames
// doesn't machine-gun the crash noise.
const BOOST_TRAIL_RESPONSE = 8;
const CRASH_SOUND_COOLDOWN_MS = 200;

// The vehicle is a fully scripted kinematic body — Rapier never integrates
// gravity/impulses for it, so the stunt-ramp mid-air arc below is entirely
// manual: detect the vehicle entering a ramp's footprint (see RAMP_CONFIGS,
// defined in TrafficObstacles.tsx alongside the ramp's visual geometry) while
// moving fast enough and roughly aligned with its climb direction, then
// integrate a simple vertical launch velocity against gravity every frame
// until it lands back at SPAWN_HEIGHT.
const GRAVITY = 30; // units/sec^2
const RAMP_LAUNCH_ZONE_FRACTION = 0.6; // fraction of ramp length where launch triggers
const RAMP_LAUNCH_MIN_SPEED = 4; // units/sec
const RAMP_LAUNCH_BASE_SPEED = 9; // units/sec, vertical velocity at launch
const RAMP_LAUNCH_SPEED_GAIN = 11; // extra vertical velocity at full speed
const LANDING_SQUASH_RESPONSE = 10;

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
  const isAudioEnabled = useRoleStore((state) => state.isAudioEnabled);
  const { startEngine, stopEngine, updateEnginePitch, playCrash } = useSound();

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
  const boostIntensity = useRef(0);

  // Rendering/physics decoupling: the visible mesh group is a sibling of the
  // RigidBody (not a child), smoothly lerped toward the RigidBody's actual
  // translation/rotation every frame instead of snapping to it 1:1 — hides
  // any physics-step/render-step timing mismatch behind a barely-perceptible
  // (~ a few frames at 60fps) smoothing lag. Collision bounds are entirely
  // unaffected since the CuboidCollider stays on the RigidBody itself.
  const meshGroupRef = useRef<THREE.Group>(null);
  const physicsPosition = useRef(new THREE.Vector3());
  const physicsQuaternion = useRef(new THREE.Quaternion());

  // Manual mid-air arc state for stunt-ramp jumps (see RAMP_LAUNCH_* above) —
  // verticalVelocity/isAirborne drive position.current.y directly since the
  // vehicle's kinematic RigidBody never gets this from Rapier itself.
  const verticalVelocity = useRef(0);
  const isAirborne = useRef(false);
  const landingSquash = useRef(0);

  const crashCooldownRef = useRef(false);

  useEffect(() => {
    if (isAudioEnabled) startEngine();
    else stopEngine();
  }, [isAudioEnabled, startEngine, stopEngine]);

  useEffect(() => stopEngine, [stopEngine]);

  const handleCollisionEnter = useCallback(
    (payload: CollisionEnterPayload) => {
      if (!payload.other.rigidBodyObject?.userData?.obstacle) return;
      impactShake.intensity = 1;
      if (crashCooldownRef.current) return;
      crashCooldownRef.current = true;
      playCrash();
      setTimeout(() => {
        crashCooldownRef.current = false;
      }, CRASH_SOUND_COOLDOWN_MS);
    },
    [playCrash],
  );

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

    // Stunt-ramp launch detection: transform the vehicle's next XZ position
    // into each ramp's local space (inverse of the same sin/cos Y-rotation
    // used for the vehicle's own heading) and check whether it's within the
    // ramp's footprint, moving fast enough, and roughly aligned with its
    // climb direction. Triggering sets a manual vertical launch velocity;
    // isAirborne itself debounces re-triggering until the vehicle lands.
    if (!isAirborne.current) {
      for (const ramp of RAMP_CONFIGS) {
        const dx = position.current.x - ramp.position[0];
        const dz = position.current.z - ramp.position[2];
        const cosR = Math.cos(ramp.rotationY);
        const sinR = Math.sin(ramp.rotationY);
        const localX = dx * cosR - dz * sinR;
        const localZ = dx * sinR + dz * cosR;
        const headingAligned = Math.cos(rotationY.current - ramp.rotationY) > 0.5;
        const speedAbs = Math.abs(currentSpeed.current);

        if (
          headingAligned &&
          speedAbs > RAMP_LAUNCH_MIN_SPEED &&
          localZ >= ramp.length * RAMP_LAUNCH_ZONE_FRACTION &&
          localZ <= ramp.length + 1.5 &&
          Math.abs(localX) <= ramp.width / 2
        ) {
          verticalVelocity.current = RAMP_LAUNCH_BASE_SPEED + speedFactor * RAMP_LAUNCH_SPEED_GAIN;
          isAirborne.current = true;
          break;
        }
      }
    }

    // Manual mid-air arc: since the kinematic RigidBody never receives
    // gravity from Rapier, integrate it by hand and land softly back at
    // SPAWN_HEIGHT (triggering a brief squash via landingSquash below).
    if (isAirborne.current) {
      verticalVelocity.current -= GRAVITY * delta;
      position.current.y += verticalVelocity.current * delta;
      if (position.current.y <= SPAWN_HEIGHT) {
        position.current.y = SPAWN_HEIGHT;
        verticalVelocity.current = 0;
        isAirborne.current = false;
        landingSquash.current = 1;
      }
    }
    landingSquash.current = damp(landingSquash.current, 0, LANDING_SQUASH_RESPONSE, delta);

    quaternion.current.setFromAxisAngle(upAxis.current, rotationY.current);

    rigidBody.setNextKinematicTranslation(position.current);
    rigidBody.setNextKinematicRotation(quaternion.current);

    vehicleTelemetry.x = position.current.x;
    vehicleTelemetry.z = position.current.z;
    vehicleTelemetry.speedFraction = speedFactor;

    // Decoupled visual mesh: lerp toward the RigidBody's own (authoritative)
    // transform rather than the just-computed target directly, using a
    // framerate-independent exponential smoothing factor.
    if (meshGroupRef.current) {
      const translation = rigidBody.translation();
      const rotation = rigidBody.rotation();
      physicsPosition.current.set(translation.x, translation.y, translation.z);
      physicsQuaternion.current.set(rotation.x, rotation.y, rotation.z, rotation.w);

      const lerpFactor = 1 - Math.exp(-25 * delta);
      meshGroupRef.current.position.lerp(physicsPosition.current, lerpFactor);
      meshGroupRef.current.quaternion.slerp(physicsQuaternion.current, lerpFactor);
    }

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
      // Soft-landing squash/stretch: briefly flattens and widens the body on
      // touchdown, then eases back to normal as landingSquash decays to 0.
      tiltGroupRef.current.scale.set(1 + landingSquash.current * 0.1, 1 - landingSquash.current * 0.18, 1 + landingSquash.current * 0.1);
    }

    // Drift dust: a fast steering change only reads as a "drift" once the
    // car has real speed behind it — gated on speedFactor, driven by how
    // hard the (speed-falloff-adjusted) turn rate is currently being pushed.
    const targetDrift = speedFactor > DRIFT_SPEED_THRESHOLD ? THREE.MathUtils.clamp(turnMagnitude, 0, 1) : 0;
    driftIntensity.current = damp(driftIntensity.current, targetDrift, DRIFT_RESPONSE, delta);

    // Nitro boost cyan wheel trail: only reads as "boosting" once the car is
    // actually being driven forward/back under boost, not merely holding the
    // key at a standstill.
    const targetBoostTrail = boost && forwardInput !== 0 ? 1 : 0;
    boostIntensity.current = damp(boostIntensity.current, targetBoostTrail, BOOST_TRAIL_RESPONSE, delta);

    // Procedural engine pitch: continuously retunes the persistent engine
    // drone's frequency/growl/volume from the car's current speed fraction.
    updateEnginePitch(speedFactor, boost);
  });

  const isAgent = activeRole === 'AGENT';

  return (
    <>
      <RigidBody
        ref={setRigidBodyRef}
        type="kinematicPosition"
        colliders={false}
        position={SPAWN_POSITION}
        onCollisionEnter={handleCollisionEnter}
      >
        <CuboidCollider args={[1.1, 0.6, 1.9]} />
      </RigidBody>
      <group ref={meshGroupRef} position={SPAWN_POSITION}>
        <group ref={tiltGroupRef}>
          {isAgent ? <AgentScooter isMobile={isMobile} /> : <CustomerCityCar isMobile={isMobile} />}
          <DriftDust intensityRef={driftIntensity} />
          <BoostTrail intensityRef={boostIntensity} />
          {/* Small hovering cloud of glowing "AI node" particles — a visual tell that ReSmart AI is routing this vehicle. */}
          {!isMobile && <Sparkles count={12} scale={1.8} size={2.5} speed={0.4} opacity={0.8} color="#22d3ee" position={[0, 1.5, 0]} />}
        </group>
      </group>
    </>
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

const BOOST_PARTICLE_COUNT = 20;

/**
 * Nitro boost wheel trail: twin neon-cyan streaks (odd/even seeds alternate
 * left/right of the rear axle) whose opacity/reach track boostIntensity (set
 * in the parent Vehicle's useFrame). Unlit + toneMapped=false so Environment.tsx's
 * Bloom picks it up, matching the rest of the scene's neon glow treatment.
 */
function BoostTrail({ intensityRef }: { intensityRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: BOOST_PARTICLE_COUNT }, (_, index) => ({
        side: index % 2 === 0 ? -1 : 1,
        speed: 1.2 + Math.random() * 0.6,
        phase: Math.random(),
      })),
    [],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const intensity = THREE.MathUtils.clamp(intensityRef.current, 0, 1);
    if (materialRef.current) materialRef.current.opacity = intensity * 0.85;
    mesh.visible = intensity > 0.05;
    if (!mesh.visible) return;

    const t = state.clock.elapsedTime;
    seeds.forEach((seed, index) => {
      const cycle = (t * seed.speed + seed.phase) % 1;
      dummy.position.set(seed.side * 0.55, 0.35, -1.9 - cycle * 5 * (0.5 + intensity));
      dummy.scale.setScalar((0.1 + intensity * 0.16) * (1 - cycle * 0.6));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BOOST_PARTICLE_COUNT]} visible={false}>
      <sphereGeometry args={[0.28, 6, 6]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#22d3ee"
        emissive="#22d3ee"
        emissiveIntensity={4}
        toneMapped={false}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

const WHEEL_TRAIL_MAX_LENGTH = 3.2;
const WHEEL_TRAIL_BASE_LENGTH = 0.4;

/**
 * Ground-hugging neon-cyan light streak anchored at each rear wheel,
 * stretching further back and glowing brighter the faster the car is going
 * — a persistent "wheel light-trail" independent of BoostTrail's nitro-only
 * effect above. Reads vehicleTelemetry.speedFraction (written every frame by
 * the parent Vehicle's own useFrame) rather than a prop, matching the same
 * module-level read pattern useVehicleTelemetry.ts documents for MiniMap.
 */
function WheelLightTrails({ wheelPositions }: { wheelPositions: Array<[number, number, number]> }) {
  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);
  const materialRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);

  useFrame(() => {
    const speedFraction = THREE.MathUtils.clamp(vehicleTelemetry.speedFraction, 0, 1);
    const length = WHEEL_TRAIL_BASE_LENGTH + speedFraction * WHEEL_TRAIL_MAX_LENGTH;

    wheelPositions.forEach((wheelPosition, index) => {
      const mesh = meshRefs.current[index];
      const material = materialRefs.current[index];
      if (!mesh || !material) return;
      mesh.scale.y = length;
      mesh.position.z = wheelPosition[2] - length / 2;
      material.opacity = speedFraction * 0.55;
    });
  });

  return (
    <>
      {wheelPositions.map((wheelPosition, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            meshRefs.current[index] = mesh;
          }}
          position={[wheelPosition[0], 0.03, wheelPosition[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.32, 1]} />
          <meshStandardMaterial
            ref={(material) => {
              materialRefs.current[index] = material;
            }}
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={3}
            toneMapped={false}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

interface VehicleMeshProps {
  isMobile: boolean;
}

/** ReSmart metallic paint spec shared by every body panel — a proper clearcoated automotive finish rather than a flat diffuse color. */
const METALLIC_PAINT_PROPS = {
  metalness: 0.75,
  roughness: 0.25,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.4,
} as const;

const NEON_STRIPE_PROPS = {
  color: '#22d3ee',
  emissive: '#22d3ee',
  emissiveIntensity: 3,
  toneMapped: false,
} as const;

/** Customer City Car: a compact sedan silhouette in ReSmart metallic blue with neon cyan side-stripes. */
function CustomerCityCar({ isMobile }: VehicleMeshProps) {
  return (
    <>
      <mesh castShadow={!isMobile} position={[0, 0.4, 0]}>
        <boxGeometry args={[2, 0.8, 3.6]} />
        <meshPhysicalMaterial {...METALLIC_PAINT_PROPS} color="#1d4ed8" />
      </mesh>
      <mesh castShadow={!isMobile} position={[0, 0.95, -0.3]}>
        <boxGeometry args={[1.6, 0.6, 1.6]} />
        <meshPhysicalMaterial {...METALLIC_PAINT_PROPS} color="#0b1d63" />
      </mesh>

      {/* Neon cyan side-stripes running the length of both flanks. */}
      {[1.01, -1.01].map((x, index) => (
        <mesh key={`stripe-${index}`} position={[x, 0.45, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.02, 0.14, 3.2]} />
          <meshStandardMaterial {...NEON_STRIPE_PROPS} />
        </mesh>
      ))}

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
        <group key={`headlight-${index}`} position={lightPosition as [number, number, number]}>
          <mesh>
            <boxGeometry args={[0.3, 0.15, 0.05]} />
            <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {!isMobile && <pointLight color="#bfe9ff" intensity={4} distance={9} decay={2} position={[0, 0, 0.3]} />}
        </group>
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

      <WheelLightTrails
        wheelPositions={[
          [1, 0.1, -1.2],
          [-1, 0.1, -1.2],
        ]}
      />

      {isMobile && <ContactShadows position={[0, -0.55, 0]} opacity={0.6} blur={2} scale={6} far={2} />}
    </>
  );
}

/** Agent Scooter: a compact two-wheel delivery scooter in ReSmart metallic green with a neon cyan side-stripe. */
function AgentScooter({ isMobile }: VehicleMeshProps) {
  return (
    <>
      {/* deck */}
      <mesh castShadow={!isMobile} position={[0, 0.25, 0]}>
        <boxGeometry args={[0.7, 0.15, 2.6]} />
        <meshPhysicalMaterial {...METALLIC_PAINT_PROPS} color="#15803d" />
      </mesh>
      {/* neon cyan side-stripe, sitting flush on top of the deck */}
      <mesh position={[0, 0.335, 0]}>
        <boxGeometry args={[0.72, 0.02, 2.2]} />
        <meshStandardMaterial {...NEON_STRIPE_PROPS} />
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
      <group position={[0, 1.1, 1.42]}>
        <mesh>
          <boxGeometry args={[0.3, 0.12, 0.05]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        {!isMobile && <pointLight color="#bfe9ff" intensity={4} distance={9} decay={2} position={[0, 0, 0.3]} />}
      </group>
      {/* taillight */}
      <mesh position={[0, 0.4, -1.32]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={2} toneMapped={false} />
      </mesh>

      <WheelLightTrails wheelPositions={[[0, 0.35, -1.3]]} />

      {isMobile && <ContactShadows position={[0, -0.25, 0]} opacity={0.5} blur={2} scale={4} far={2} />}
    </>
  );
}
