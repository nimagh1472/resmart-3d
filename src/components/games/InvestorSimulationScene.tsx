'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FacingText } from '@/components/3d/FacingText';
import { TOWER_TOTAL_HEIGHT } from '@/components/3d/World';
import { DUBAI_LANDMARKS } from '@/lib/pitchData';
import { VISUAL_FLEET_CAP, investorSimTelemetry, type InvestorResult, type InvestorSimPhase } from './investorGameState';

const { CENTRAL_TOWER_POSITION, BOULEVARD_INNER_RADIUS, BOULEVARD_OUTER_RADIUS } = DUBAI_LANDMARKS;

const dummy = new THREE.Object3D();
const ZERO_SCALE = new THREE.Vector3(0, 0, 0);
const ONE_SCALE = new THREE.Vector3(1, 1, 1);

const CHART_BASE_Y = TOWER_TOTAL_HEIGHT + 5;
const CHART_BAR_MAX_HEIGHT = 10;
const CHART_VALUE_CLAMP = 200; // percent — bars saturate past this either direction

function barHeightFor(value: number): number {
  return THREE.MathUtils.clamp(Math.abs(value) / CHART_VALUE_CLAMP, 0.06, 1) * CHART_BAR_MAX_HEIGHT;
}

/**
 * Fleet markers orbiting the Boulevard ring while a simulation is running,
 * and a holographic ROI/margin/efficiency bar chart hovering above the
 * Central Tower once results are in. Reads investorSimTelemetry every frame
 * (module-level, written by InvestorGame.tsx's dashboard — see
 * investorGameState.ts for why this bypasses React state/props) so this
 * component needs no props at all; it's mounted once, unconditionally,
 * inside Experience.tsx's Canvas.
 */
export function InvestorSimulationScene() {
  const fleetRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    const fleet = fleetRef.current;
    if (!fleet) return;

    const isRunning = investorSimTelemetry.phase === 'RUNNING';
    const activeCount = isRunning ? Math.min(investorSimTelemetry.fleetSize, VISUAL_FLEET_CAP) : 0;
    const speed = 0.3 + (investorSimTelemetry.efficiencyPct / 100) * 0.9;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < VISUAL_FLEET_CAP; i += 1) {
      if (i < activeCount) {
        const radius = THREE.MathUtils.lerp(BOULEVARD_INNER_RADIUS, BOULEVARD_OUTER_RADIUS, (i % 5) / 4);
        const angleOffset = (i / activeCount) * Math.PI * 2;
        const angle = t * speed + angleOffset;
        dummy.position.set(
          CENTRAL_TOWER_POSITION[0] + Math.sin(angle) * radius,
          0.6 + Math.sin(t * 3 + i) * 0.15,
          CENTRAL_TOWER_POSITION[2] + Math.cos(angle) * radius,
        );
        dummy.rotation.set(0, angle, 0);
        dummy.scale.copy(ONE_SCALE);
      } else {
        dummy.position.set(0, -50, 0);
        dummy.scale.copy(ZERO_SCALE);
      }
      dummy.updateMatrix();
      fleet.setMatrixAt(i, dummy.matrix);
    }
    fleet.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={fleetRef} args={[undefined, undefined, VISUAL_FLEET_CAP]} castShadow={false}>
        <boxGeometry args={[0.5, 0.3, 0.9]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} toneMapped={false} />
      </instancedMesh>
      <ROIChart />
    </>
  );
}

function ROIChart() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  // investorSimTelemetry is a plain mutable object (deliberately, so the fleet
  // animation above never routes 60fps data through React state) — reading
  // `.result` directly in JSX would only ever reflect whatever it was on this
  // component's *last* React-triggered render, since mutating a plain object
  // doesn't itself cause a re-render. Bridge it into real state exactly once,
  // the frame the phase actually flips to COMPLETE.
  const [result, setResult] = useState<InvestorResult | null>(null);
  const lastPhaseRef = useRef<InvestorSimPhase>('IDLE');

  const bars = useMemo(
    () => [
      { key: 'margin', color: '#22c55e', getValue: (r: InvestorResult) => r.netProfitMarginPct, label: 'Net Margin' },
      { key: 'roi', color: '#facc15', getValue: (r: InvestorResult) => r.roiPct, label: 'ROI' },
      { key: 'efficiency', color: '#22d3ee', getValue: (r: InvestorResult) => r.operationalEfficiencyScore, label: 'Efficiency' },
    ],
    [],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (ringRef.current) ringRef.current.rotation.y += delta * 0.4;

    const phase = investorSimTelemetry.phase;
    if (phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase;
      setResult(phase === 'COMPLETE' ? investorSimTelemetry.result : null);
    }

    if (group) group.visible = phase === 'COMPLETE' && investorSimTelemetry.result !== null;
  });

  return (
    <group ref={groupRef} position={[CENTRAL_TOWER_POSITION[0], CHART_BASE_Y, CENTRAL_TOWER_POSITION[2]]} visible={false}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4, 0.06, 8, 48]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={2} toneMapped={false} transparent opacity={0.7} />
      </mesh>

      <FacingText position={[0, 3, 0]} fontSize={0.7} color="#e0f2fe" anchorX="center" anchorY="middle">
        SIMULATION RESULTS
      </FacingText>

      {bars.map((bar, index) => {
        const value = result ? bar.getValue(result) : 0;
        const height = result ? barHeightFor(value) : 0.06;
        const x = (index - 1) * 2.2;
        return (
          <group key={bar.key} position={[x, 0, 0]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[1.2, height, 1.2]} />
              <meshStandardMaterial
                color={bar.color}
                emissive={bar.color}
                emissiveIntensity={value >= 0 ? 2 : 1}
                toneMapped={false}
                transparent
                opacity={0.75}
              />
            </mesh>
            <FacingText position={[0, height + 0.8, 0]} fontSize={0.5} color={bar.color} anchorX="center" anchorY="middle">
              {`${bar.label}: ${value.toFixed(0)}${bar.key === 'efficiency' ? '' : '%'}`}
            </FacingText>
          </group>
        );
      })}
    </group>
  );
}
