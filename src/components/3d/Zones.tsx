'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRoleStore } from '@/hooks/useRoleStore';
import { ZONES } from '@/lib/pitchData';
import { Zone } from '@/components/3d/Zone';

interface ZonesProps {
  vehicleRef: React.RefObject<RapierRigidBody>;
}

export function Zones({ vehicleRef }: ZonesProps) {
  const activeRole = useRoleStore((state) => state.activeRole);
  const completedZones = useRoleStore((state) => state.completedZones);
  const setNearestZoneId = useRoleStore((state) => state.setNearestZoneId);
  const lastNearestZoneId = useRef<string | null>(null);

  const visibleZones = activeRole ? ZONES.filter((zone) => zone.visibleTo.includes(activeRole)) : ZONES;

  // Tracks the nearest not-yet-completed zone so GUIDED mode can steer the
  // camera toward it (CameraRig.tsx) and highlight it as the next waypoint
  // (Zone.tsx), both reading nearestZoneId back out of the store.
  useFrame(() => {
    const vehicle = vehicleRef.current;
    if (!vehicle) return;

    const vehiclePosition = vehicle.translation();
    let closestZoneId: string | null = null;
    let closestDistanceSq = Infinity;

    for (const zone of visibleZones) {
      if (completedZones.includes(zone.id)) continue;
      const dx = vehiclePosition.x - zone.position[0];
      const dz = vehiclePosition.z - zone.position[2];
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < closestDistanceSq) {
        closestDistanceSq = distanceSq;
        closestZoneId = zone.id;
      }
    }

    if (closestZoneId !== lastNearestZoneId.current) {
      lastNearestZoneId.current = closestZoneId;
      setNearestZoneId(closestZoneId);
    }
  });

  return (
    <>
      {visibleZones.map((zone) => (
        <Zone key={zone.id} zone={zone} vehicleRef={vehicleRef} />
      ))}
    </>
  );
}
