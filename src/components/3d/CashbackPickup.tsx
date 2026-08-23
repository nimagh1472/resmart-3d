'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRoleStore } from '@/hooks/useRoleStore';
import { FacingText } from '@/components/3d/FacingText';
import type { CashbackPickup as CashbackPickupData } from '@/types';

interface CashbackPickupProps {
  pickup: CashbackPickupData;
  vehicleRef: React.RefObject<RapierRigidBody>;
}

const TRIGGER_RADIUS = 4;

/**
 * Quest 2 (Customer) — a glowing collectible coin scattered around the
 * city. Driving over it instantly credits its dollar amount to the
 * customer's wallet (useRoleStore.collectCashback, idempotent per id) and
 * the coin then hides itself.
 */
export function CashbackPickup({ pickup, vehicleRef }: CashbackPickupProps) {
  const spinRef = useRef<Group>(null);
  const isCollected = useRoleStore((state) => state.collectedPickupIds.includes(pickup.id));
  const collectCashback = useRoleStore((state) => state.collectCashback);

  useFrame((state, delta) => {
    if (spinRef.current) {
      spinRef.current.rotation.y += delta * 2;
      spinRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 2.5) * 0.2;
    }

    if (isCollected) return;
    const vehicle = vehicleRef.current;
    if (!vehicle) return;

    const vehiclePosition = vehicle.translation();
    const dx = vehiclePosition.x - pickup.position[0];
    const dz = vehiclePosition.z - pickup.position[2];
    if (Math.sqrt(dx * dx + dz * dz) <= TRIGGER_RADIUS) {
      collectCashback(pickup.id, pickup.amount);
    }
  });

  if (isCollected) return null;

  return (
    <group position={pickup.position}>
      <group ref={spinRef} position={[0, 1.2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.15, 24]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        <FacingText position={[0, 0, 0.1]} fontSize={0.5} color="#78350f" anchorX="center" anchorY="middle">
          {`AED ${pickup.amount}`}
        </FacingText>
      </group>
      <pointLight position={[0, 1.5, 0]} color="#facc15" intensity={12} distance={8} decay={2} />
    </group>
  );
}
