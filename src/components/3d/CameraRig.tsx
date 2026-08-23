'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRoleStore } from '@/hooks/useRoleStore';
import { CINEMATIC_DWELL_SECONDS, STATIONS } from '@/lib/pitchData';
import type { PresentationMode } from '@/types';

interface CameraRigProps {
  vehicleRef: React.RefObject<RapierRigidBody>;
}

// Predefined per-mode camera offsets/keyframes, applied relative to the
// vehicle's own orientation quaternion.
const INTERACTIVE_OFFSET = new THREE.Vector3(0, 25, 40);
const GUIDED_OFFSET = new THREE.Vector3(0, 11, -18);
const LOOK_AT_OFFSET = new THREE.Vector3(0, 0, 0);
const MIN_HEIGHT_ABOVE_VEHICLE = 8;

/**
 * Converts a per-second exponential-approach "response" rate into the
 * instantaneous factor Vector3.lerp/Quaternion.slerp expect, given this
 * frame's delta — the same framerate-independent damping Vehicle.tsx's local
 * damp() uses, just expressed as a factor rather than wrapped around lerp
 * itself, since a Quaternion has no componentwise damp of its own.
 */
function dampFactor(response: number, delta: number): number {
  return 1 - Math.exp(-response * delta);
}

// Overview shown before a vehicle exists or a role has been picked, so the
// camera never defaults to an unframed/undefined view (e.g. pointing at the
// sky) while the player is still on the role-select screen.
const OVERVIEW_POSITION = new THREE.Vector3(0, 15, 30);
const OVERVIEW_LOOK_TARGET = new THREE.Vector3(0, 0, 0);

const TOUR_ORBIT_RADIUS = 18;
const TOUR_ORBIT_HEIGHT = 12;
const TOUR_ORBIT_ANGULAR_SPEED = 0.3; // rad/sec

// In GUIDED mode, how close (world units) the vehicle needs to be to the
// nearest incomplete zone before the camera fully swings to frame it.
const GUIDED_REVEAL_RANGE = 40;
const GUIDED_REVEAL_STRENGTH = 0.6;

// Response rates (per second) for the framerate-independent exponential
// damp — replaces the old raw per-frame lerp factors (which were implicitly
// tuned for ~60fps and would drift at other frame rates).
const POSITION_RESPONSE: Record<PresentationMode, number> = {
  INTERACTIVE: 5,
  GUIDED: 2.5,
  CINEMATIC: 1.8,
};
const ROTATION_RESPONSE: Record<PresentationMode, number> = {
  INTERACTIVE: 7,
  GUIDED: 3.5,
  CINEMATIC: 2.5,
};

/**
 * Drives the camera per presentation mode, using only native R3F/three.js
 * primitives (Vector3.lerp for position, Quaternion.slerp for orientation —
 * no GSAP or other animation library):
 * - INTERACTIVE: a tight chase cam, full player drive control.
 * - GUIDED: player still drives, but at a wider predefined offset, and the
 *   look target auto-navigates toward the nearest incomplete zone's
 *   "optimal angle" as the vehicle approaches (see nearestZoneId, set by
 *   Zones.tsx).
 * - CINEMATIC: zero player input (see Vehicle.tsx) — the camera
 *   automatically orbits each pitch zone's predefined keyframe position in
 *   turn (see lib/pitchData.ts STATIONS), advancing every
 *   CINEMATIC_DWELL_SECONDS.
 * Because position and rotation are both lerped/slerped every frame rather
 * than snapped, switching modes always eases smoothly into the new target.
 */
export function CameraRig({ vehicleRef }: CameraRigProps) {
  const { camera } = useThree();
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const activeRole = useRoleStore((state) => state.activeRole);
  const cinematicZoneIndex = useRoleStore((state) => state.cinematicZoneIndex);
  const setCinematicZoneIndex = useRoleStore((state) => state.setCinematicZoneIndex);
  const nearestZoneId = useRoleStore((state) => state.nearestZoneId);

  const previousMode = useRef<PresentationMode>(presentationMode);
  const dwellElapsed = useRef(0);
  const orbitAngle = useRef(0);

  const desiredPosition = useRef(new THREE.Vector3(0, 15, 30));
  const lookTarget = useRef(new THREE.Vector3());
  const lookMatrix = useRef(new THREE.Matrix4());
  const desiredQuaternion = useRef(new THREE.Quaternion());
  const vehiclePosition = useRef(new THREE.Vector3());
  const vehicleQuaternion = useRef(new THREE.Quaternion());
  const guidedZoneTarget = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const vehicle = vehicleRef.current;

    const enteringCinematic = presentationMode === 'CINEMATIC' && previousMode.current !== 'CINEMATIC';
    if (enteringCinematic) {
      dwellElapsed.current = 0;
      orbitAngle.current = 0;
    }
    previousMode.current = presentationMode;

    if (vehicle) {
      const translation = vehicle.translation();
      const rotation = vehicle.rotation();
      vehiclePosition.current.set(translation.x, translation.y, translation.z);
      vehicleQuaternion.current.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }

    if (!vehicle || activeRole === null) {
      // No vehicle mounted yet, or the player hasn't picked a role (still on
      // the role-select screen) — hold a nicely framed overview of the city
      // instead of chasing an undefined/not-yet-driving vehicle.
      desiredPosition.current.copy(OVERVIEW_POSITION);
      lookTarget.current.copy(OVERVIEW_LOOK_TARGET);
    } else if (presentationMode === 'CINEMATIC') {
      dwellElapsed.current += delta;
      orbitAngle.current += delta * TOUR_ORBIT_ANGULAR_SPEED;

      if (dwellElapsed.current >= CINEMATIC_DWELL_SECONDS) {
        dwellElapsed.current = 0;
        setCinematicZoneIndex((cinematicZoneIndex + 1) % STATIONS.length);
      }

      const zone = STATIONS[cinematicZoneIndex];
      const [zoneX, zoneY, zoneZ] = zone.position;

      desiredPosition.current.set(
        zoneX + Math.sin(orbitAngle.current) * TOUR_ORBIT_RADIUS,
        zoneY + TOUR_ORBIT_HEIGHT,
        zoneZ + Math.cos(orbitAngle.current) * TOUR_ORBIT_RADIUS,
      );
      lookTarget.current.set(zoneX, zoneY + 2, zoneZ);
    } else {
      const offsetPreset = presentationMode === 'GUIDED' ? GUIDED_OFFSET : INTERACTIVE_OFFSET;
      const offset = offsetPreset.clone().applyQuaternion(vehicleQuaternion.current);
      desiredPosition.current.copy(vehiclePosition.current).add(offset);
      lookTarget.current.copy(vehiclePosition.current).add(LOOK_AT_OFFSET);

      // GUIDED: auto-navigate the look target toward the nearest incomplete
      // pitch station's "optimal angle" as the vehicle approaches it, without
      // taking control of the actual driving away from the player.
      const guidedZone = presentationMode === 'GUIDED' && nearestZoneId ? STATIONS.find((z) => z.id === nearestZoneId) : undefined;
      if (guidedZone) {
        guidedZoneTarget.current.set(...guidedZone.position);
        const distance = vehiclePosition.current.distanceTo(guidedZoneTarget.current);
        const revealWeight = THREE.MathUtils.clamp(1 - distance / GUIDED_REVEAL_RANGE, 0, 1) * GUIDED_REVEAL_STRENGTH;
        lookTarget.current.lerp(guidedZoneTarget.current, revealWeight);
      }

      // Ground-clip guard: never let the camera sag below a safe height
      // above the vehicle, even on ramps/inclines elsewhere in the world.
      desiredPosition.current.y = Math.max(desiredPosition.current.y, vehiclePosition.current.y + MIN_HEIGHT_ABOVE_VEHICLE);
    }

    camera.position.lerp(desiredPosition.current, dampFactor(POSITION_RESPONSE[presentationMode], delta));

    // Built directly from Matrix4.lookAt (eye, target, up) rather than via a
    // helper Object3D's own .lookAt(): Object3D (unlike Camera/Light) treats
    // +Z as "forward", so a plain-Object3D helper produces an orientation
    // that's backwards for a camera. Computing the matrix ourselves keeps
    // the camera/light forward-is-"-Z" convention.
    lookMatrix.current.lookAt(camera.position, lookTarget.current, camera.up);
    desiredQuaternion.current.setFromRotationMatrix(lookMatrix.current);
    camera.quaternion.slerp(desiredQuaternion.current, dampFactor(ROTATION_RESPONSE[presentationMode], delta));
  });

  return null;
}
