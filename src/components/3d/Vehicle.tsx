'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { controlsState } from '@/hooks/useKeyboardControls';
import { useRoleStore } from '@/hooks/useRoleStore';
import { vehicleTelemetry } from '@/hooks/useVehicleTelemetry';
import { WORLD_BOUNDS } from '@/lib/pitchData';

const MAX_SPEED = 18; // units/sec
const BOOST_MULTIPLIER = 1.6;
const TURN_RATE = 2.2; // rad/sec
const VEHICLE_HALF_WIDTH = 1.5;
const SPAWN_HEIGHT = 0.6;

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

  const rigidBodyRef = useRef<RapierRigidBody>(null);
  useImperativeHandle(ref, () => rigidBodyRef.current as RapierRigidBody);

  const position = useRef(new THREE.Vector3(0, SPAWN_HEIGHT, 0));
  const rotationY = useRef(0);
  const quaternion = useRef(new THREE.Quaternion());

  useFrame((_, delta) => {
    const rigidBody = rigidBodyRef.current;
    if (!rigidBody) return;

    const inputEnabled = presentationMode !== 'CINEMATIC';
    const forwardInput = inputEnabled ? controlsState.forward : 0;
    const turnInput = inputEnabled ? controlsState.turn : 0;
    const boost = inputEnabled && controlsState.boost;

    const speed = forwardInput * MAX_SPEED * speedBoostMultiplier * (boost ? BOOST_MULTIPLIER : 1);
    rotationY.current += turnInput * TURN_RATE * delta * (forwardInput < 0 ? -1 : 1);

    const nextX = position.current.x + Math.sin(rotationY.current) * speed * delta;
    const nextZ = position.current.z + Math.cos(rotationY.current) * speed * delta;

    position.current.x = Math.min(
      WORLD_BOUNDS.maxX - VEHICLE_HALF_WIDTH,
      Math.max(WORLD_BOUNDS.minX + VEHICLE_HALF_WIDTH, nextX),
    );
    position.current.z = Math.min(
      WORLD_BOUNDS.maxZ - VEHICLE_HALF_WIDTH,
      Math.max(WORLD_BOUNDS.minZ + VEHICLE_HALF_WIDTH, nextZ),
    );

    quaternion.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY.current);

    rigidBody.setNextKinematicTranslation(position.current);
    rigidBody.setNextKinematicRotation(quaternion.current);

    vehicleTelemetry.x = position.current.x;
    vehicleTelemetry.z = position.current.z;
  });

  const isAgent = activeRole === 'AGENT';

  return (
    <RigidBody ref={rigidBodyRef} type="kinematicPosition" colliders={false} position={[0, SPAWN_HEIGHT, 0]}>
      <CuboidCollider args={[1.1, 0.6, 1.9]} />
      {isAgent ? <AgentScooter isMobile={isMobile} /> : <CustomerCityCar isMobile={isMobile} />}
    </RigidBody>
  );
});

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
