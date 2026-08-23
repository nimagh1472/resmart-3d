'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ACESFilmicToneMapping } from 'three';
import {
  BASE_FORWARD_SPEED,
  ITEM_TRIGGER_RADIUS,
  LANE_COUNT,
  LANE_WIDTH,
  LANE_X_POSITIONS,
  ROAD_LENGTH,
  customerControlsState,
  customerGameTelemetry,
  generateTrack,
} from './customerGameState';

const ROAD_WIDTH = LANE_WIDTH * LANE_COUNT + 2;
const CAMERA_OFFSET = new THREE.Vector3(0, 6.5, -9);
const LOOK_OFFSET = new THREE.Vector3(0, 1.5, 6);

// Reusable scratch vectors — see DriverGameScene.tsx / CameraRig.tsx for the
// same no-per-frame-allocation pattern.
const carWorldPosition = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const desiredLookTarget = new THREE.Vector3();
const offsetScratch = new THREE.Vector3();

function dampFactor(response: number, delta: number): number {
  return 1 - Math.exp(-response * delta);
}

/** Same simple decorative car as DriverGameScene — no physics, position driven by useFrame below. */
function Car({ carRef }: { carRef: React.RefObject<THREE.Group> }) {
  const wheelPositions: Array<[number, number, number]> = [
    [-0.9, 0.35, 1.1],
    [0.9, 0.35, 1.1],
    [-0.9, 0.35, -1.1],
    [0.9, 0.35, -1.1],
  ];

  return (
    <group ref={carRef}>
      <mesh position={[0, 0.55, 0]} castShadow={false}>
        <boxGeometry args={[1.7, 0.7, 3.4]} />
        <meshStandardMaterial color="#a855f7" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[0, 1.05, -0.2]} castShadow={false}>
        <boxGeometry args={[1.3, 0.5, 1.6]} />
        <meshStandardMaterial color="#7e22ce" metalness={0.75} roughness={0.15} />
      </mesh>
      {wheelPositions.map((position, index) => (
        <mesh key={index} position={position} rotation={[0, 0, Math.PI / 2]} castShadow={false}>
          <cylinderGeometry args={[0.35, 0.35, 0.3, 16]} />
          <meshStandardMaterial color="#111111" roughness={0.8} />
        </mesh>
      ))}
      <pointLight color="#c084fc" intensity={4} distance={6} position={[0, 1, -2]} />
    </group>
  );
}

/**
 * Correct target item — a glowing green parcel with a ribbon, +100pts on
 * pickup. Color/shape-only differentiation from WrongMarker (no 3D text
 * labels): dozens of these mount simultaneously per track, and drei/troika's
 * worker-based glyph layout per <Text> instance is expensive enough at that
 * count to noticeably stall scene mount — plain geometry stays instant.
 */
function TargetMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow={false}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.8} toneMapped={false} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.46]} castShadow={false}>
        <boxGeometry args={[0.12, 0.95, 0.02]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow={false}>
        <boxGeometry args={[0.95, 0.12, 0.2]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <pointLight color="#22c55e" intensity={5} distance={5} decay={2} />
    </group>
  );
}

/** Incorrect/damaged item — picking this is instant Game Over. Red/orange, tumbled at an angle to read as "damaged" at a glance. */
function WrongMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow={false} rotation={[0.1, 0.3, 0.05]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={1.6} toneMapped={false} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.4]} rotation={[0, 0, Math.PI / 4]} castShadow={false}>
        <boxGeometry args={[0.9, 0.12, 0.05]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <pointLight color="#ef4444" intensity={5} distance={5} decay={2} />
    </group>
  );
}

const SKYLINE_GLOW_COLORS = ['#FF8FA3', '#FFD166', '#4ECDC4'];

/** Glowing glass skyscraper — an opaque metallic-glass tower with an emissive window band, echoing 3d/World.tsx's Building(). */
function GlassTower({
  position,
  width,
  height,
  depth,
  glowColor,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  glowColor: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow={false}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#D4F1F9" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, height * 0.62, depth / 2 + 0.02]}>
        <boxGeometry args={[width * 0.7, height * 0.12, 0.05]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Skyline() {
  const buildings = useMemo(() => {
    const items: Array<{ x: number; z: number; width: number; height: number; depth: number; glowColor: string }> = [];
    for (let z = 0; z < ROAD_LENGTH; z += 22) {
      items.push({
        x: -(ROAD_WIDTH / 2 + 6 + Math.random() * 4),
        z,
        width: 6,
        height: 10 + Math.random() * 22,
        depth: 6,
        glowColor: SKYLINE_GLOW_COLORS[items.length % SKYLINE_GLOW_COLORS.length],
      });
      items.push({
        x: ROAD_WIDTH / 2 + 6 + Math.random() * 4,
        z: z + 10,
        width: 6,
        height: 10 + Math.random() * 22,
        depth: 6,
        glowColor: SKYLINE_GLOW_COLORS[items.length % SKYLINE_GLOW_COLORS.length],
      });
    }
    return items;
  }, []);

  return (
    <>
      {buildings.map((building, index) => (
        <GlassTower
          key={index}
          position={[building.x, 0, building.z]}
          width={building.width}
          height={building.height}
          depth={building.depth}
          glowColor={building.glowColor}
        />
      ))}
    </>
  );
}

const BURJ_SEGMENTS = [
  { width: 9, height: 12 },
  { width: 7, height: 10 },
  { width: 5.2, height: 8 },
  { width: 3.6, height: 7 },
  { width: 2.2, height: 6 },
];
const BURJ_SPIRE_HEIGHT = 14;
const BURJ_POSITION: [number, number, number] = [0, 0, ROAD_LENGTH + 130];

/** Distant Burj Khalifa-inspired landmark tower, visible ahead through the haze as the road's endpoint. */
function BurjKhalifaLandmark() {
  let cumulativeHeight = 0;
  const segments = BURJ_SEGMENTS.map((segment) => {
    const y = cumulativeHeight;
    cumulativeHeight += segment.height;
    return { ...segment, y };
  });

  return (
    <group position={BURJ_POSITION}>
      {segments.map((segment, index) => (
        <mesh key={index} position={[0, segment.y + segment.height / 2, 0]} castShadow={false}>
          <boxGeometry args={[segment.width, segment.height, segment.width]} />
          <meshStandardMaterial color="#D4F1F9" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}
      <mesh position={[0, cumulativeHeight + BURJ_SPIRE_HEIGHT / 2, 0]} castShadow={false}>
        <coneGeometry args={[1.1, BURJ_SPIRE_HEIGHT, 8]} />
        <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight
        position={[0, cumulativeHeight + BURJ_SPIRE_HEIGHT, 0]}
        color="#FFD166"
        intensity={60}
        distance={140}
        decay={2}
      />
    </group>
  );
}

/**
 * Self-contained pick-and-avoid lane scene: the car auto-drives along +Z at
 * a constant BASE_FORWARD_SPEED, lane position lerps toward
 * customerControlsState.lane, and item pickups are resolved via simple
 * distance checks against the fixed, deterministic track layout (see
 * customerGameState.ts) — no Rapier physics needed. Picking a 'wrong' item
 * flips telemetry.phase straight to GAME_OVER; CustomerGame.tsx's HUD polls
 * that transition and reacts (see driverGameState.ts's sibling for why
 * per-frame state lives in refs/module telemetry rather than React state).
 */
export function CustomerGameScene() {
  const carRef = useRef<THREE.Group>(null);
  const track = useMemo(() => generateTrack(), []);
  const consumedIds = useRef<Set<string>>(new Set());
  const carLaneX = useRef(LANE_X_POSITIONS[1]);

  return (
    <Canvas
      shadows={false}
      camera={{ position: [0, 6.5, -9], fov: 55, near: 0.5, far: 400 }}
      dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.25)}
      gl={{
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1,
        powerPreference: 'high-performance',
        antialias: false,
        stencil: false,
      }}
    >
      <color attach="background" args={['#D5E5ED']} />
      <fog attach="fog" args={['#D5E5ED', 70, 340]} />
      <hemisphereLight args={['#FFD8A8', '#8D7B68', 0.6]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[40, 30, 10]} intensity={1.9} color="#FFB066" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, ROAD_LENGTH / 2]} receiveShadow={false}>
        <planeGeometry args={[ROAD_WIDTH + 90, ROAD_LENGTH + 260]} />
        <meshStandardMaterial color="#E5DAC3" roughness={0.95} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROAD_LENGTH / 2]} receiveShadow={false}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH + 40]} />
        <meshStandardMaterial color="#334155" roughness={0.85} metalness={0.1} />
      </mesh>
      {[-LANE_WIDTH / 2, LANE_WIDTH / 2].map((x, index) => (
        <mesh key={index} position={[x, 0.01, ROAD_LENGTH / 2]}>
          <boxGeometry args={[0.12, 0.02, ROAD_LENGTH + 40]} />
          <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      ))}

      <Skyline />
      <BurjKhalifaLandmark />

      {track.map((item) =>
        item.kind === 'target' ? (
          <TargetMarker key={item.id} position={[LANE_X_POSITIONS[item.lane], 1, item.z]} />
        ) : (
          <WrongMarker key={item.id} position={[LANE_X_POSITIONS[item.lane], 1, item.z]} />
        ),
      )}

      <Car carRef={carRef} />

      <FrameLoop carRef={carRef} track={track} consumedIds={consumedIds} carLaneX={carLaneX} />
    </Canvas>
  );
}

interface FrameLoopProps {
  carRef: React.RefObject<THREE.Group>;
  track: ReturnType<typeof generateTrack>;
  consumedIds: React.MutableRefObject<Set<string>>;
  carLaneX: React.MutableRefObject<number>;
}

function FrameLoop({ carRef, track, consumedIds, carLaneX }: FrameLoopProps) {
  useFrame(({ camera }, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    const car = carRef.current;
    if (!car) return;

    if (customerGameTelemetry.phase !== 'RUNNING') {
      carWorldPosition.set(car.position.x, 0, car.position.z);
    } else {
      customerGameTelemetry.z += BASE_FORWARD_SPEED * delta;

      const targetX = LANE_X_POSITIONS[customerControlsState.lane];
      carLaneX.current = THREE.MathUtils.lerp(carLaneX.current, targetX, dampFactor(10, delta));

      car.position.set(carLaneX.current, 0, customerGameTelemetry.z);
      carWorldPosition.copy(car.position);

      for (const item of track) {
        if (consumedIds.current.has(item.id)) continue;
        if (item.lane !== customerControlsState.lane) continue;
        const distance = Math.abs(customerGameTelemetry.z - item.z);
        if (distance >= ITEM_TRIGGER_RADIUS) continue;

        consumedIds.current.add(item.id);
        if (item.kind === 'target') {
          customerGameTelemetry.correctPicks += 1;
        } else {
          customerGameTelemetry.phase = 'GAME_OVER';
        }
      }

      if (customerGameTelemetry.phase === 'RUNNING' && customerGameTelemetry.z >= ROAD_LENGTH) {
        customerGameTelemetry.phase = 'FINISHED';
      }
    }

    offsetScratch.copy(CAMERA_OFFSET);
    desiredCameraPosition.copy(carWorldPosition).add(offsetScratch);
    camera.position.lerp(desiredCameraPosition, dampFactor(8, delta));

    desiredLookTarget.copy(carWorldPosition).add(LOOK_OFFSET);
    camera.lookAt(desiredLookTarget);
  });

  return null;
}
