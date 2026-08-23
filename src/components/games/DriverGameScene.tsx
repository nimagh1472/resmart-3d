'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ACESFilmicToneMapping } from 'three';
import {
  BASE_FORWARD_SPEED,
  BOOST_DURATION_MS,
  BOOST_SPEED_MULTIPLIER,
  LANE_COUNT,
  LANE_WIDTH,
  LANE_X_POSITIONS,
  NODE_TRIGGER_RADIUS,
  OBSTACLE_TRIGGER_RADIUS,
  ROAD_LENGTH,
  SLOW_DURATION_MS,
  SLOW_SPEED_MULTIPLIER,
  driverControlsState,
  driverGameTelemetry,
  generateTrack,
} from './driverGameState';

const ROAD_WIDTH = LANE_WIDTH * LANE_COUNT + 2;
const CAMERA_OFFSET = new THREE.Vector3(0, 6.5, -9);
const LOOK_OFFSET = new THREE.Vector3(0, 1.5, 6);

// Reusable scratch vectors — allocated once at module scope, mutated every
// frame in useFrame, never reallocated (see CameraRig.tsx for the same
// pattern in the main pitch experience).
const carWorldPosition = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const desiredLookTarget = new THREE.Vector3();
const offsetScratch = new THREE.Vector3();

function dampFactor(response: number, delta: number): number {
  return 1 - Math.exp(-response * delta);
}

/** Simple box-based car — decorative only, no physics; position is driven directly by useFrame below. */
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
        <meshStandardMaterial color="#0891b2" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[0, 1.05, -0.2]} castShadow={false}>
        <boxGeometry args={[1.3, 0.5, 1.6]} />
        <meshStandardMaterial color="#0e7490" metalness={0.75} roughness={0.15} />
      </mesh>
      {wheelPositions.map((position, index) => (
        <mesh key={index} position={position} rotation={[0, 0, Math.PI / 2]} castShadow={false}>
          <cylinderGeometry args={[0.35, 0.35, 0.3, 16]} />
          <meshStandardMaterial color="#111111" roughness={0.8} />
        </mesh>
      ))}
      <pointLight color="#22d3ee" intensity={4} distance={6} position={[0, 1, -2]} />
    </group>
  );
}

function ObstacleMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow={false}>
        <coneGeometry args={[0.5, 1.1, 12]} />
        <meshStandardMaterial color="#FF7A45" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.55, 0]} castShadow={false}>
        <boxGeometry args={[0.9, 0.1, 0.9]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.7} />
      </mesh>
    </group>
  );
}

function NodeMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <octahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={3} toneMapped={false} metalness={0.6} roughness={0.15} />
      </mesh>
      <pointLight color="#22c55e" intensity={6} distance={5} decay={2} />
    </group>
  );
}

const SKYLINE_GLOW_COLORS = ['#00E5FF', '#FFD166', '#4ECDC4'];

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
        <meshStandardMaterial color="#BFE9F5" metalness={0.85} roughness={0.2} />
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
 * Self-contained lane-runner scene: the car auto-drives along +Z at
 * BASE_FORWARD_SPEED (modulated by node-boost/obstacle-slow multipliers),
 * lane position lerps toward driverControlsState.lane every frame, and
 * collisions/collects are detected by simple distance checks against the
 * fixed, deterministic track layout — no Rapier physics needed for an
 * arcade-style lane game. All per-frame state lives in refs/module-level
 * telemetry (driverGameTelemetry), never React state, so this runs at full
 * frame rate without re-render overhead.
 */
export function DriverGameScene() {
  const carRef = useRef<THREE.Group>(null);
  const track = useMemo(() => generateTrack(), []);
  const consumedIds = useRef<Set<string>>(new Set());
  const speedBoostUntil = useRef(0);
  const speedSlowUntil = useRef(0);
  const carLaneX = useRef(LANE_X_POSITIONS[1]);
  const elapsedSeconds = useRef(0);

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
        item.kind === 'obstacle' ? (
          <ObstacleMarker key={item.id} position={[LANE_X_POSITIONS[item.lane], 0.55, item.z]} />
        ) : (
          <NodeMarker key={item.id} position={[LANE_X_POSITIONS[item.lane], 1.3, item.z]} />
        ),
      )}

      <Car carRef={carRef} />

      <FrameLoop
        carRef={carRef}
        track={track}
        consumedIds={consumedIds}
        speedBoostUntil={speedBoostUntil}
        speedSlowUntil={speedSlowUntil}
        carLaneX={carLaneX}
        elapsedSeconds={elapsedSeconds}
      />
    </Canvas>
  );
}

interface FrameLoopProps {
  carRef: React.RefObject<THREE.Group>;
  track: ReturnType<typeof generateTrack>;
  consumedIds: React.MutableRefObject<Set<string>>;
  speedBoostUntil: React.MutableRefObject<number>;
  speedSlowUntil: React.MutableRefObject<number>;
  carLaneX: React.MutableRefObject<number>;
  elapsedSeconds: React.MutableRefObject<number>;
}

function FrameLoop({ carRef, track, consumedIds, speedBoostUntil, speedSlowUntil, carLaneX, elapsedSeconds }: FrameLoopProps) {
  useFrame(({ camera }, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    const car = carRef.current;
    if (!car) return;

    if (driverGameTelemetry.phase !== 'RUNNING') {
      // Still let the camera settle into place during the countdown.
      carWorldPosition.set(car.position.x, 0, car.position.z);
    } else {
      const now = performance.now();
      let speedMultiplier = 1;
      if (now < speedBoostUntil.current) speedMultiplier = BOOST_SPEED_MULTIPLIER;
      else if (now < speedSlowUntil.current) speedMultiplier = SLOW_SPEED_MULTIPLIER;
      driverGameTelemetry.speedMultiplier = speedMultiplier;

      driverGameTelemetry.z += BASE_FORWARD_SPEED * speedMultiplier * delta;
      elapsedSeconds.current += delta;
      driverGameTelemetry.elapsedSeconds = elapsedSeconds.current;

      const targetX = LANE_X_POSITIONS[driverControlsState.lane];
      carLaneX.current = THREE.MathUtils.lerp(carLaneX.current, targetX, dampFactor(10, delta));

      car.position.set(carLaneX.current, 0, driverGameTelemetry.z);
      carWorldPosition.copy(car.position);

      for (const item of track) {
        if (consumedIds.current.has(item.id)) continue;
        if (item.lane !== driverControlsState.lane) continue;
        const distance = Math.abs(driverGameTelemetry.z - item.z);

        if (item.kind === 'node' && distance < NODE_TRIGGER_RADIUS) {
          consumedIds.current.add(item.id);
          driverGameTelemetry.nodesCollected += 1;
          speedBoostUntil.current = now + BOOST_DURATION_MS;
        } else if (item.kind === 'obstacle' && distance < OBSTACLE_TRIGGER_RADIUS) {
          consumedIds.current.add(item.id);
          driverGameTelemetry.collisionCount += 1;
          speedSlowUntil.current = now + SLOW_DURATION_MS;
        }
      }

      if (driverGameTelemetry.z >= ROAD_LENGTH) {
        driverGameTelemetry.phase = 'FINISHED';
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
