'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import confetti from 'canvas-confetti';
import type { Group, Mesh } from 'three';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRoleStore } from '@/hooks/useRoleStore';
import { PITCH_METRICS } from '@/lib/pitchData';
import type { ZoneDefinition } from '@/types';

interface ZoneProps {
  zone: ZoneDefinition;
  vehicleRef: React.RefObject<RapierRigidBody>;
}

const TRIGGER_RADIUS = 6;
const EXPRESS_BOOST_MULTIPLIER = 2;
const EXPRESS_BOOST_DURATION_MS = 5000;

function formatMetricValue(value: number | string): string {
  if (typeof value !== 'number') return value;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  if (value >= 1_000) return `$${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return `$${value.toLocaleString()}`;
}

/**
 * A drivable pitch waypoint. Completes itself (once — completeZone is
 * idempotent per id, see useRoleStore) when the vehicle enters its trigger
 * radius, using simple distance checks rather than a physics collider,
 * matching the vehicle's own kinematic (non-dynamic) motion. Every piece of
 * displayed copy (title, caption, metric values/assumptions) is read
 * straight from lib/pitchData.ts — nothing here is hard-coded.
 *
 * In GUIDED mode, the nearest incomplete zone (tracked in Zones.tsx and
 * exposed via useRoleStore's nearestZoneId) spins its beacon faster and
 * shows a bouncing arrow, so the UI visibly highlights the next waypoint
 * while CameraRig.tsx separately swings the camera toward it.
 */
export function Zone({ zone, vehicleRef }: ZoneProps) {
  const beaconRef = useRef<Group>(null);
  const arrowRef = useRef<Mesh>(null);
  const isCompleted = useRoleStore((state) => state.completedZones.includes(zone.id));
  const completeZone = useRoleStore((state) => state.completeZone);
  const activateSpeedBoost = useRoleStore((state) => state.activateSpeedBoost);
  const openLeadModal = useRoleStore((state) => state.openLeadModal);
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const nearestZoneId = useRoleStore((state) => state.nearestZoneId);
  const hasFiredCompletionEffect = useRef(false);

  const isNearestWaypoint = presentationMode === 'GUIDED' && !isCompleted && nearestZoneId === zone.id;

  useFrame((state, delta) => {
    const vehicle = vehicleRef.current;
    if (beaconRef.current) beaconRef.current.rotation.y += delta * (isNearestWaypoint ? 2.4 : 0.6);
    if (arrowRef.current) {
      arrowRef.current.visible = isNearestWaypoint;
      arrowRef.current.position.y = 8 + Math.sin(state.clock.elapsedTime * 3) * 0.4;
    }

    if (!vehicle || isCompleted) return;

    const vehiclePosition = vehicle.translation();
    const dx = vehiclePosition.x - zone.position[0];
    const dz = vehiclePosition.z - zone.position[2];
    if (Math.sqrt(dx * dx + dz * dz) <= TRIGGER_RADIUS) {
      completeZone(zone.id);
    }
  });

  useEffect(() => {
    if (!isCompleted || hasFiredCompletionEffect.current) return;
    hasFiredCompletionEffect.current = true;

    if (zone.id === 'EXPRESS_DELIVERY') {
      activateSpeedBoost(EXPRESS_BOOST_MULTIPLIER, EXPRESS_BOOST_DURATION_MS);
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#a855f7', '#7dd3fc'],
      });
      openLeadModal('zone3_express_delivery_complete');
    }
  }, [isCompleted, zone.id, activateSpeedBoost, openLeadModal]);

  const color = isCompleted ? '#22c55e' : '#3b82f6';

  return (
    <group position={zone.position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} onClick={() => completeZone(zone.id)}>
        <circleGeometry args={[TRIGGER_RADIUS, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.35} />
      </mesh>

      <group ref={beaconRef} position={[0, 3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 5, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isNearestWaypoint ? 1.4 : 0.6} />
        </mesh>
      </group>

      {/* GUIDED-mode waypoint highlight: a bouncing arrow over the nearest incomplete zone */}
      <mesh ref={arrowRef} position={[0, 8, 0]} rotation={[Math.PI, 0, 0]} visible={false}>
        <coneGeometry args={[0.5, 1, 6]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>

      <Text position={[0, 6.6, 0]} fontSize={1.1} color="#f8fafc" anchorX="center" anchorY="middle">
        {zone.title}
      </Text>
      <Text position={[0, 5.3, 0]} fontSize={0.45} color="#cbd5e1" anchorX="center" anchorY="middle" maxWidth={11}>
        {zone.investorPitchLine.text}
      </Text>

      <ZoneFeature zone={zone} />
    </group>
  );
}

function ZoneFeature({ zone }: { zone: ZoneDefinition }) {
  switch (zone.id) {
    case 'AI_SEARCH':
      return <HolographicSearchLens />;
    case 'VERIFIED_AGENT':
      return <MerchantTestBench />;
    case 'EXPRESS_DELIVERY':
      return <ExpressDeliveryRamp />;
    case 'TRACTION_ASK':
      return <TractionBillboards metricKeys={zone.metricKeys} />;
    default:
      return null;
  }
}

/** Zone 1 — AI Vision Search: a spinning holographic lens scanning three
 * price pedestals, the shortest (cheapest) one glowing as the winner. */
function HolographicSearchLens() {
  const ringRef = useRef<Group>(null);
  const beamRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.8;
      ringRef.current.rotation.x += delta * 0.3;
    }
    if (beamRef.current) {
      beamRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 1.5) * 1;
    }
  });

  const pedestalHeights = [1, 1.8, 0.6];
  const bestHeight = Math.min(...pedestalHeights);

  return (
    <group position={[0, 0, -4]}>
      <group ref={ringRef} position={[0, 2.5, 0]}>
        <mesh>
          <torusGeometry args={[1.4, 0.06, 8, 32]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.05, 8, 32]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={beamRef} position={[0, 1.2, 0]}>
        <planeGeometry args={[2.6, 0.05]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#7dd3fc"
          emissiveIntensity={3}
          toneMapped={false}
          transparent
          opacity={0.8}
        />
      </mesh>
      {pedestalHeights.map((height, index) => (
        <mesh key={index} position={[(index - 1) * 1.4, height / 2, 2]}>
          <boxGeometry args={[0.6, height, 0.6]} />
          <meshStandardMaterial
            color={height === bestHeight ? '#22c55e' : '#312e81'}
            emissive={height === bestHeight ? '#22c55e' : '#000000'}
            emissiveIntensity={height === bestHeight ? 1.5 : 0}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Zone 2 — Certified Refurbished Merchant Station: a test bench with a
 * sweeping inspection scan-line and a rotating "certified" badge ring. */
function MerchantTestBench() {
  const scanRef = useRef<Mesh>(null);
  const badgeRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (scanRef.current) {
      scanRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.35;
    }
    if (badgeRef.current) badgeRef.current.rotation.y += delta * 1.2;
  });

  return (
    <group position={[0, 0, -4]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[3, 0.8, 1.4]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1, 0.3, 0.6]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh ref={scanRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 0.02, 0.7]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={3}
          toneMapped={false}
          transparent
          opacity={0.7}
        />
      </mesh>
      <group ref={badgeRef} position={[0, 2.6, 0]}>
        <mesh>
          <torusGeometry args={[0.6, 0.12, 8, 24]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Zone 3 — 2-Hour Express Delivery Ramp: a stunt ramp plus a glowing
 * countdown billboard ticking down from 120:00. Completing this zone also
 * opens the lead-capture modal (see the completion useEffect above). */
function ExpressDeliveryRamp() {
  return (
    <group position={[0, 0, -6]}>
      <mesh position={[0, 1, 4]} rotation={[Math.PI / 10, 0, 0]} castShadow>
        <boxGeometry args={[4, 0.4, 8]} />
        <meshStandardMaterial color="#312e81" />
      </mesh>
      <CountdownBillboard />
    </group>
  );
}

function CountdownBillboard() {
  const TOTAL_SECONDS = 120 * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(TOTAL_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((current) => (current <= 0 ? TOTAL_SECONDS : current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [TOTAL_SECONDS]);

  const minutes = Math.floor(secondsRemaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (secondsRemaining % 60).toString().padStart(2, '0');

  return (
    <group position={[0, 5, -2]}>
      <mesh>
        <boxGeometry args={[4, 2, 0.2]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <Text position={[0, 0, 0.15]} fontSize={0.9} color="#22c55e" anchorX="center" anchorY="middle">
        {`${minutes}:${seconds}`}
      </Text>
    </group>
  );
}

/** Zone 4 — Pitch & Traction Hub: a cluster of neon billboards, one per
 * zone.metricKeys entry, each pulling label/value/assumption from
 * PITCH_METRICS. */
function TractionBillboards({ metricKeys }: { metricKeys: string[] }) {
  const spacing = 4.2;
  const startX = -((metricKeys.length - 1) * spacing) / 2;

  return (
    <group position={[0, 0, -4]}>
      {metricKeys.map((key, index) => {
        const metric = PITCH_METRICS[key];
        if (!metric) return null;

        return (
          <group key={key} position={[startX + index * spacing, 3, 0]}>
            <mesh castShadow>
              <boxGeometry args={[3.4, 2.6, 0.2]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <Text
              position={[0, 0.8, 0.15]}
              fontSize={0.3}
              color="#a855f7"
              anchorX="center"
              anchorY="middle"
              maxWidth={3}
              textAlign="center"
            >
              {metric.label}
            </Text>
            <Text position={[0, 0.15, 0.15]} fontSize={0.55} color="#22c55e" anchorX="center" anchorY="middle">
              {formatMetricValue(metric.value)}
            </Text>
            <Text
              position={[0, -0.75, 0.15]}
              fontSize={0.18}
              color="#94a3b8"
              anchorX="center"
              anchorY="middle"
              maxWidth={3}
              textAlign="center"
            >
              {metric.assumption}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
