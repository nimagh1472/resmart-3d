'use client';

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRoleStore } from '@/hooks/useRoleStore';
import { CASHBACK_PICKUPS, STATIONS } from '@/lib/pitchData';
import { Zone } from '@/components/3d/Zone';
import { CashbackPickup } from '@/components/3d/CashbackPickup';

interface ZonesProps {
  vehicleRef: React.RefObject<RapierRigidBody>;
}

export const Zones = memo(function Zones({ vehicleRef }: ZonesProps) {
  const activeRole = useRoleStore((state) => state.activeRole);
  const completedStations = useRoleStore((state) => state.completedStations);
  const setNearestZoneId = useRoleStore((state) => state.setNearestZoneId);
  const lastNearestZoneId = useRef<string | null>(null);

  const visibleStations = activeRole ? STATIONS.filter((station) => station.visibleTo.includes(activeRole)) : STATIONS;

  // Tracks the nearest not-yet-completed station so GUIDED mode can steer the
  // camera toward it (CameraRig.tsx) and highlight it as the next waypoint
  // (Zone.tsx), both reading nearestZoneId back out of the store.
  useFrame(() => {
    const vehicle = vehicleRef.current;
    if (!vehicle) return;

    const vehiclePosition = vehicle.translation();
    let closestStationId: string | null = null;
    let closestDistanceSq = Infinity;

    for (const station of visibleStations) {
      if (completedStations.includes(station.id)) continue;
      const dx = vehiclePosition.x - station.position[0];
      const dz = vehiclePosition.z - station.position[2];
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < closestDistanceSq) {
        closestDistanceSq = distanceSq;
        closestStationId = station.id;
      }
    }

    if (closestStationId !== lastNearestZoneId.current) {
      lastNearestZoneId.current = closestStationId;
      setNearestZoneId(closestStationId);
    }
  });

  return (
    <>
      {visibleStations.map((station) => (
        <Zone key={station.id} zone={station} vehicleRef={vehicleRef} />
      ))}
      {activeRole === 'CUSTOMER' &&
        CASHBACK_PICKUPS.map((pickup) => <CashbackPickup key={pickup.id} pickup={pickup} vehicleRef={vehicleRef} />)}
    </>
  );
});
