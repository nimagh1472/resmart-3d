'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import confetti from 'canvas-confetti';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRoleStore } from '@/hooks/useRoleStore';
import { PITCH_METRICS, randomInRange } from '@/lib/pitchData';
import { FacingText } from '@/components/3d/FacingText';
import type { StationDefinition, StationId } from '@/types';

interface ZoneProps {
  zone: StationDefinition;
  vehicleRef: React.RefObject<RapierRigidBody>;
}

const TRIGGER_RADIUS = 6;
const EXPRESS_BOOST_MULTIPLIER = 2;
const EXPRESS_BOOST_DURATION_MS = 5000;
const HINT_VISIBLE_MS = 2200;

// Stations that complete exactly once and stay completed (green beacon,
// tracked via useRoleStore's completedStations). The three Agent-loop
// stations are excluded — they're revisited every delivery cycle, gated by
// agentOrderStage rather than a one-shot completion flag.
const ONE_SHOT_STATION_IDS: StationId[] = ['CUSTOMER_STORE', 'CUSTOMER_EXPRESS', 'TRACTION_ASK'];

function formatMetricValue(value: number | string): string {
  if (typeof value !== 'number') return value;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  if (value >= 1_000) return `$${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return `$${value.toLocaleString()}`;
}

/**
 * A drivable pitch/quest waypoint. One-shot stations (CUSTOMER_STORE,
 * CUSTOMER_EXPRESS, TRACTION_ASK) complete themselves once, the moment the
 * vehicle enters their trigger radius, via useRoleStore's idempotent
 * completeStation. The three Agent-loop stations (AGENT_DISPATCH,
 * AGENT_VERIFY, AGENT_DROPOFF) are edge-triggered instead — they fire again
 * every time the vehicle re-enters the radius, gated by agentOrderStage, so
 * a Driver can repeat the dispatch -> verify -> drop-off loop endlessly.
 *
 * In GUIDED mode, the nearest incomplete one-shot station spins its beacon
 * faster and shows a bouncing arrow, so the UI visibly highlights the next
 * waypoint while CameraRig.tsx separately swings the camera toward it.
 */
export function Zone({ zone, vehicleRef }: ZoneProps) {
  const beaconRef = useRef<Group>(null);
  const arrowRef = useRef<Mesh>(null);

  const completedStations = useRoleStore((state) => state.completedStations);
  const completeStation = useRoleStore((state) => state.completeStation);
  const activateSpeedBoost = useRoleStore((state) => state.activateSpeedBoost);
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const nearestZoneId = useRoleStore((state) => state.nearestZoneId);
  const agentOrderStage = useRoleStore((state) => state.agentOrderStage);
  const startExpressOrder = useRoleStore((state) => state.startExpressOrder);
  const acceptDispatch = useRoleStore((state) => state.acceptDispatch);
  const completeVerification = useRoleStore((state) => state.completeVerification);
  const completeDropoff = useRoleStore((state) => state.completeDropoff);
  const pushFeaturePopup = useRoleStore((state) => state.pushFeaturePopup);

  const isOneShotStation = ONE_SHOT_STATION_IDS.includes(zone.id);
  const isCompleted = isOneShotStation && completedStations.includes(zone.id);
  const hasFiredCompletionEffect = useRef(false);

  const wasInsideRef = useRef(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isNearestWaypoint = presentationMode === 'GUIDED' && !isCompleted && nearestZoneId === zone.id;

  useFrame((state, delta) => {
    if (beaconRef.current) beaconRef.current.rotation.y += delta * (isNearestWaypoint ? 2.4 : 0.6);
    if (arrowRef.current) {
      arrowRef.current.visible = isNearestWaypoint;
      arrowRef.current.position.y = 8 + Math.sin(state.clock.elapsedTime * 3) * 0.4;
    }

    const vehicle = vehicleRef.current;
    if (!vehicle) return;

    const vehiclePosition = vehicle.translation();
    const dx = vehiclePosition.x - zone.position[0];
    const dz = vehiclePosition.z - zone.position[2];
    const isInside = Math.sqrt(dx * dx + dz * dz) <= TRIGGER_RADIUS;

    if (isOneShotStation) {
      if (!isCompleted && isInside) completeStation(zone.id);
      return;
    }

    if (isInside && !wasInsideRef.current) {
      handleAgentStationEnter(zone.id);
    }
    wasInsideRef.current = isInside;
  });

  function showHint(text: string) {
    setHintText(text);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setHintText(null), HINT_VISIBLE_MS);
  }

  function handleAgentStationEnter(id: StationId) {
    if (id === 'AGENT_DISPATCH') {
      if (agentOrderStage !== 'IDLE') {
        showHint('Order already in progress');
        return;
      }
      acceptDispatch();
      pushFeaturePopup('AGENT_EARNINGS', 'Order accepted — head to the Test Bench');
      return;
    }

    if (id === 'AGENT_VERIFY') {
      if (agentOrderStage !== 'DISPATCHED') {
        showHint('Accept an order at the Pickup Station first');
        return;
      }
      const fee = completeVerification();
      pushFeaturePopup('AGENT_EARNINGS', `+$${fee.toFixed(0)} testing fee`);
      return;
    }

    if (id === 'AGENT_DROPOFF') {
      if (agentOrderStage !== 'VERIFIED') {
        showHint('Verify the gadget at the Test Bench first');
        return;
      }
      const bonus = completeDropoff();
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#a855f7', '#7dd3fc'],
      });
      pushFeaturePopup('DELIVERY_GUARANTEE', `+$${bonus.toFixed(0)} delivery bonus`);
    }
  }

  useEffect(() => {
    if (!isOneShotStation || !isCompleted || hasFiredCompletionEffect.current) return;
    hasFiredCompletionEffect.current = true;

    if (zone.id === 'CUSTOMER_STORE') {
      const savings = randomInRange(8, 40);
      pushFeaturePopup('AI_COMPARISON', `Found a deal $${savings.toFixed(0)} cheaper`);
    }

    if (zone.id === 'CUSTOMER_EXPRESS') {
      startExpressOrder();
      activateSpeedBoost(EXPRESS_BOOST_MULTIPLIER, EXPRESS_BOOST_DURATION_MS);
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#a855f7', '#7dd3fc'],
      });
      pushFeaturePopup('DELIVERY_GUARANTEE', 'Order placed — arriving in under 2 hours');
      // completeStation (triggered just above, via useFrame) already advances
      // this to Chapter 3 and fires the campaign-complete voucher screen —
      // no separate lead-modal call needed here.
    }
  }, [isCompleted, isOneShotStation, zone.id, activateSpeedBoost, pushFeaturePopup, startExpressOrder]);

  const color = getStationColor(zone.id, isCompleted, agentOrderStage);

  return (
    <group position={zone.position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} onClick={() => isOneShotStation && completeStation(zone.id)}>
        <circleGeometry args={[TRIGGER_RADIUS, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.35} />
      </mesh>

      <group ref={beaconRef} position={[0, 3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 5, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isNearestWaypoint ? 1.4 : 0.6} />
        </mesh>
      </group>

      {/* GUIDED-mode waypoint highlight: a bouncing arrow over the nearest incomplete station */}
      <mesh ref={arrowRef} position={[0, 8, 0]} rotation={[Math.PI, 0, 0]} visible={false}>
        <coneGeometry args={[0.5, 1, 6]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>

      <FacingText position={[0, 6.6, 0]} fontSize={1.1} color="#f8fafc" anchorX="center" anchorY="middle">
        {zone.title}
      </FacingText>
      <FacingText position={[0, 5.3, 0]} fontSize={0.45} color="#cbd5e1" anchorX="center" anchorY="middle" maxWidth={11}>
        {zone.investorPitchLine.text}
      </FacingText>

      {hintText && (
        <FacingText position={[0, 4.2, 0]} fontSize={0.4} color="#facc15" anchorX="center" anchorY="middle" maxWidth={10}>
          {hintText}
        </FacingText>
      )}

      <ZoneFeature zone={zone} />
    </group>
  );
}

function getStationColor(
  id: StationId,
  isCompleted: boolean,
  agentOrderStage: 'IDLE' | 'DISPATCHED' | 'VERIFIED',
): string {
  if (id === 'AGENT_DISPATCH') return agentOrderStage === 'IDLE' ? '#3b82f6' : '#475569';
  if (id === 'AGENT_VERIFY') return agentOrderStage === 'DISPATCHED' ? '#3b82f6' : '#475569';
  if (id === 'AGENT_DROPOFF') return agentOrderStage === 'VERIFIED' ? '#3b82f6' : '#475569';
  return isCompleted ? '#22c55e' : '#3b82f6';
}

function ZoneFeature({ zone }: { zone: StationDefinition }) {
  switch (zone.id) {
    case 'CUSTOMER_STORE':
      return <HolographicSearchLens />;
    case 'AGENT_VERIFY':
      return <MerchantTestBench />;
    case 'CUSTOMER_EXPRESS':
      return <ExpressDeliveryRamp />;
    case 'AGENT_DISPATCH':
      return <DispatchKiosk />;
    case 'AGENT_DROPOFF':
      return <SpeedRamp />;
    case 'TRACTION_ASK':
      return <TractionBillboards metricKeys={zone.metricKeys} />;
    default:
      return null;
  }
}

/** Quest 1 (Customer) — AI Vision Search: a spinning holographic lens scanning three
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

/** Quest 2 (Agent) — Certified Refurbished Merchant Station: a test bench with a
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

/** Quest 1 (Agent) — Pickup Station: a dispatch kiosk with a blinking "new order" ticket. */
function DispatchKiosk() {
  const ticketRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (ticketRef.current) {
      const material = ticketRef.current.material as MeshStandardMaterial | undefined;
      const pulse = 1.5 + Math.sin(state.clock.elapsedTime * 4) * 1.2;
      if (material) material.emissiveIntensity = pulse;
    }
  });

  return (
    <group position={[0, 0, -4]}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[1.2, 2, 0.6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 2.1, 0.32]}>
        <planeGeometry args={[0.9, 0.6]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh ref={ticketRef} position={[0, 2.1, 0.34]}>
        <planeGeometry args={[0.7, 0.4]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Quest 3 (Agent) — Express Drop-off: a speed ramp finish line. */
function SpeedRamp() {
  return (
    <group position={[0, 0, -6]}>
      <mesh position={[0, 1, 4]} rotation={[Math.PI / 10, 0, 0]} castShadow>
        <boxGeometry args={[4, 0.4, 8]} />
        <meshStandardMaterial color="#14532d" />
      </mesh>
    </group>
  );
}

/** Quest 3 (Customer) — 2-Hour Express Pickup Ramp: a stunt ramp plus a glowing
 * countdown billboard ticking down under the delivery-guarantee SLA. */
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
  const TOTAL_SECONDS = 118 * 60; // just under the 2-hour delivery guarantee
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
      <FacingText position={[0, 0, 0.15]} fontSize={0.9} color="#22c55e" anchorX="center" anchorY="middle">
        {`${minutes}:${seconds}`}
      </FacingText>
    </group>
  );
}

/** Traction Hub — a cluster of neon billboards, one per zone.metricKeys entry, each
 * pulling label/value/assumption from PITCH_METRICS. */
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
            <FacingText
              position={[0, 0.8, 0.15]}
              fontSize={0.3}
              color="#a855f7"
              anchorX="center"
              anchorY="middle"
              maxWidth={3}
              textAlign="center"
            >
              {metric.label}
            </FacingText>
            <FacingText position={[0, 0.15, 0.15]} fontSize={0.55} color="#22c55e" anchorX="center" anchorY="middle">
              {formatMetricValue(metric.value)}
            </FacingText>
            <FacingText
              position={[0, -0.75, 0.15]}
              fontSize={0.18}
              color="#94a3b8"
              anchorX="center"
              anchorY="middle"
              maxWidth={3}
              textAlign="center"
            >
              {metric.assumption}
            </FacingText>
          </group>
        );
      })}
    </group>
  );
}
