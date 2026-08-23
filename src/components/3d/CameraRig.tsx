'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRoleStore } from '@/hooks/useRoleStore';
import { CINEMATIC_DWELL_SECONDS, ZONES } from '@/lib/pitchData';
import type { PresentationMode } from '@/types';

interface CameraRigProps {
  vehicleRef: React.RefObject<RapierRigidBody>;
}

// Predefined per-mode camera offsets/keyframes, applied relative to the
// vehicle's own orientation quaternion.
const INTERACTIVE_OFFSET = new THREE.Vector3(0, 6, -10);
const GUIDED_OFFSET = new THREE.Vector3(0, 11, -18);

const TOUR_ORBIT_RADIUS = 18;
const TOUR_ORBIT_HEIGHT = 12;
const TOUR_ORBIT_ANGULAR_SPEED = 0.3; // rad/sec

// In GUIDED mode, how close (world units) the vehicle needs to be to the
// nearest incomplete zone before the camera fully swings to frame it.
const GUIDED_REVEAL_RANGE = 40;
const GUIDED_REVEAL_STRENGTH = 0.6;

const POSITION_SMOOTHING: Record<PresentationMode, number> = {
  INTERACTIVE: 0.08,
  GUIDED: 0.04,
  CINEMATIC: 0.03,
};
const ROTATION_SMOOTHING: Record<PresentationMode, number> = {
  INTERACTIVE: 0.12,
  GUIDED: 0.06,
  CINEMATIC: 0.04,
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
 *   turn (see lib/pitchData.ts ZONES), advancing every
 *   CINEMATIC_DWELL_SECONDS.
 * Because position and rotation are both lerped/slerped every frame rather
 * than snapped, switching modes always eases smoothly into the new target.
 */
export function CameraRig({ vehicleRef }: CameraRigProps) {
  const { camera } = useThree();
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const cinematicZoneIndex = useRoleStore((state) => state.cinematicZoneIndex);
  const setCinematicZoneIndex = useRoleStore((state) => state.setCinematicZoneIndex);
  const nearestZoneId = useRoleStore((state) => state.nearestZoneId);

  const previousMode = useRef<PresentationMode>(presentationMode);
  const dwellElapsed = useRef(0);
  const orbitAngle = useRef(0);

  const desiredPosition = useRef(new THREE.Vector3(0, 12, -20));
  const lookTarget = useRef(new THREE.Vector3());
  const lookHelper = useRef(new THREE.Object3D());
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

    if (presentationMode === 'CINEMATIC' || !vehicle) {
      dwellElapsed.current += delta;
      orbitAngle.current += delta * TOUR_ORBIT_ANGULAR_SPEED;

      if (dwellElapsed.current >= CINEMATIC_DWELL_SECONDS) {
        dwellElapsed.current = 0;
        setCinematicZoneIndex((cinematicZoneIndex + 1) % ZONES.length);
      }

      const zone = ZONES[cinematicZoneIndex];
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
      lookTarget.current.copy(vehiclePosition.current);

      // GUIDED: auto-navigate the look target toward the nearest incomplete
      // pitch station's "optimal angle" as the vehicle approaches it, without
      // taking control of the actual driving away from the player.
      const guidedZone = presentationMode === 'GUIDED' && nearestZoneId ? ZONES.find((z) => z.id === nearestZoneId) : undefined;
      if (guidedZone) {
        guidedZoneTarget.current.set(...guidedZone.position);
        const distance = vehiclePosition.current.distanceTo(guidedZoneTarget.current);
        const revealWeight = THREE.MathUtils.clamp(1 - distance / GUIDED_REVEAL_RANGE, 0, 1) * GUIDED_REVEAL_STRENGTH;
        lookTarget.current.lerp(guidedZoneTarget.current, revealWeight);
      }
    }

    camera.position.lerp(desiredPosition.current, POSITION_SMOOTHING[presentationMode]);

    lookHelper.current.position.copy(camera.position);
    lookHelper.current.lookAt(lookTarget.current);
    camera.quaternion.slerp(lookHelper.current.quaternion, ROTATION_SMOOTHING[presentationMode]);
  });

  return null;
}
