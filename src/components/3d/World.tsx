'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { WORLD_BOUNDS } from '@/lib/pitchData';
import { FacingText } from '@/components/3d/FacingText';
import { GLASS_TOWER_MATERIAL_PROPS, BACKGROUND_BUILDING_MATERIAL_PROPS } from '@/components/3d/Environment';
import type { DistrictId } from '@/types';

// Ambient decorative skyline only — no driving/routes/stations. Every
// position below is a local constant (pitchData.ts no longer exports
// DUBAI_LANDMARKS/STATIONS now that there's no drivable world to place them in).
const CENTRAL_TOWER_POSITION: [number, number, number] = [0, 0, 0];

interface BuildingConfig {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: string;
  neonColor: string;
}

const EDGE_OFFSET = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / 2 + 15;
// Lighter skyline than the old drivable-city version (which needed enough
// filler buildings to feel like a real district) — this is now just a
// backdrop, so fewer, larger silhouettes read better and cost less.
const BUILDINGS_PER_EDGE = 3;
const EDGE_SPACING = 46;
const SKYLINE_NEON_COLORS = ['#00E5FF', '#D4AF37'];

function buildEdge(axis: 'x' | 'z', sign: 1 | -1): BuildingConfig[] {
  return Array.from({ length: BUILDINGS_PER_EDGE }, (_, index) => {
    const offset = (index - (BUILDINGS_PER_EDGE - 1) / 2) * EDGE_SPACING;
    const height = 16 + (index % 3) * 10;
    const color = index % 2 === 0 ? '#0F1720' : '#12181d';
    const neonColor = SKYLINE_NEON_COLORS[index % SKYLINE_NEON_COLORS.length];
    const position: [number, number, number] =
      axis === 'z' ? [offset, 0, sign * EDGE_OFFSET] : [sign * EDGE_OFFSET, 0, offset];

    return { position, width: 9, depth: 9, height, color, neonColor };
  });
}

const SKYLINE_BUILDINGS: BuildingConfig[] = [
  ...buildEdge('z', 1),
  ...buildEdge('z', -1),
  ...buildEdge('x', 1),
  ...buildEdge('x', -1),
];

/** Groups the skyline buildings by a shared key (body color or neon accent color) so each group can be rendered as a single InstancedMesh. */
function groupSkylineBuildingsBy(key: 'color' | 'neonColor'): Array<{ key: string; buildings: BuildingConfig[] }> {
  const groups = new Map<string, BuildingConfig[]>();
  SKYLINE_BUILDINGS.forEach((building) => {
    const groupKey = building[key];
    const list = groups.get(groupKey);
    if (list) list.push(building);
    else groups.set(groupKey, [building]);
  });
  return Array.from(groups, ([groupKey, buildings]) => ({ key: groupKey, buildings }));
}

const SKYLINE_BODY_GROUPS = groupSkylineBuildingsBy('color');
const SKYLINE_NEON_GROUPS = groupSkylineBuildingsBy('neonColor');
const NEON_STRIP_HEIGHT_FRACTIONS = [0.3, 0.55, 0.8];

/**
 * The repeated skyline filler buildings ringing WORLD_BOUNDS, rendered as
 * three InstancedMesh batches (bodies, neon strips, glow spheres) grouped by
 * their shared body/neon color, instead of one mesh per building.
 */
function SkylineBuildings() {
  return (
    <>
      {SKYLINE_BODY_GROUPS.map((group) => (
        <SkylineBodyGroup key={`body-${group.key}`} color={group.key} buildings={group.buildings} />
      ))}
      {SKYLINE_NEON_GROUPS.map((group) => (
        <SkylineNeonStripGroup key={`strip-${group.key}`} color={group.key} buildings={group.buildings} />
      ))}
      {SKYLINE_NEON_GROUPS.map((group) => (
        <SkylineGlowSphereGroup key={`glow-${group.key}`} color={group.key} buildings={group.buildings} />
      ))}
    </>
  );
}

function SkylineBodyGroup({ color, buildings }: { color: string; buildings: BuildingConfig[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    buildings.forEach((building, index) => {
      dummy.position.set(building.position[0], building.height / 2, building.position[2]);
      dummy.scale.set(building.width, building.height, building.depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [buildings]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, buildings.length]} castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial {...BACKGROUND_BUILDING_MATERIAL_PROPS} color={color} />
    </instancedMesh>
  );
}

function SkylineNeonStripGroup({ color, buildings }: { color: string; buildings: BuildingConfig[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const instanceCount = buildings.length * NEON_STRIP_HEIGHT_FRACTIONS.length;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let instanceIndex = 0;
    buildings.forEach((building) => {
      NEON_STRIP_HEIGHT_FRACTIONS.forEach((fraction) => {
        dummy.position.set(
          building.position[0],
          building.height * fraction,
          building.position[2] + building.depth / 2 + 0.02,
        );
        dummy.scale.set(building.width * 0.7, 0.3, 0.05);
        dummy.updateMatrix();
        mesh.setMatrixAt(instanceIndex, dummy.matrix);
        instanceIndex += 1;
      });
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [buildings]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, instanceCount]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
    </instancedMesh>
  );
}

function SkylineGlowSphereGroup({ color, buildings }: { color: string; buildings: BuildingConfig[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    buildings.forEach((building, index) => {
      dummy.position.set(building.position[0], building.height + 0.6, building.position[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [buildings]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, buildings.length]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4} toneMapped={false} />
    </instancedMesh>
  );
}

const TRAFFIC_LANE_X_OFFSETS = [-9, -6, -3, 3, 6, 9];
const TRAFFIC_PARTICLES_PER_LANE = 6;
const TRAFFIC_LANE_LENGTH = 220;
const TRAFFIC_STREAK_LENGTH = 3.4;
const TRAFFIC_SPEED = 24; // units/sec — fast highway motion the camera flies over
const TRAFFIC_Y = 0.18;

interface TrafficParticleConfig {
  laneX: number;
  color: string;
  phase: number;
}

function buildTrafficParticles(): TrafficParticleConfig[] {
  return TRAFFIC_LANE_X_OFFSETS.flatMap((laneX, laneIndex) => {
    const color = SKYLINE_NEON_COLORS[laneIndex % SKYLINE_NEON_COLORS.length];
    return Array.from({ length: TRAFFIC_PARTICLES_PER_LANE }, (_, index) => ({
      laneX,
      color,
      phase: (index / TRAFFIC_PARTICLES_PER_LANE) * TRAFFIC_LANE_LENGTH,
    }));
  });
}

const TRAFFIC_PARTICLES = buildTrafficParticles();

function groupTrafficParticlesByColor(): Array<{ color: string; particles: TrafficParticleConfig[] }> {
  const groups = new Map<string, TrafficParticleConfig[]>();
  TRAFFIC_PARTICLES.forEach((particle) => {
    const list = groups.get(particle.color);
    if (list) list.push(particle);
    else groups.set(particle.color, [particle]);
  });
  return Array.from(groups, ([color, particles]) => ({ color, particles }));
}

const TRAFFIC_GROUPS = groupTrafficParticlesByColor();

/**
 * One lane-color's worth of Sheikh Zayed Road traffic streaks, rendered as a
 * single InstancedMesh whose per-instance Z wraps every TRAFFIC_LANE_LENGTH
 * units (state updated in useFrame, unlike the static skyline instances
 * above) so a small fixed pool of streaks reads as continuous fast-moving
 * highway traffic flowing under the camera's flight path.
 */
function TrafficLaneGroup({ color, particles }: { color: string; particles: TrafficParticleConfig[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const elapsed = state.clock.elapsedTime;
    particles.forEach((particle, index) => {
      const z = ((particle.phase + elapsed * TRAFFIC_SPEED) % TRAFFIC_LANE_LENGTH) - TRAFFIC_LANE_LENGTH / 2;
      dummy.position.set(particle.laneX, TRAFFIC_Y, z);
      dummy.scale.set(0.4, 0.14, TRAFFIC_STREAK_LENGTH);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
    </instancedMesh>
  );
}

/** Neon gold/cyan traffic streams racing along Sheikh Zayed Road's lanes beneath the camera's flight path. */
function TrafficStreams() {
  return (
    <>
      {TRAFFIC_GROUPS.map((group) => (
        <TrafficLaneGroup key={group.color} color={group.color} particles={group.particles} />
      ))}
    </>
  );
}

interface TowerSegmentConfig {
  width: number;
  depth: number;
  height: number;
}

const TOWER_SEGMENTS: TowerSegmentConfig[] = [
  { width: 11, depth: 11, height: 6 },
  { width: 9, depth: 9, height: 5 },
  { width: 7.2, depth: 7.2, height: 5 },
  { width: 5.6, depth: 5.6, height: 4.5 },
  { width: 4, depth: 4, height: 4 },
  { width: 2.4, depth: 2.4, height: 3.5 },
];
const TOWER_SPIRE_HEIGHT = 12;
const TOWER_TOTAL_HEIGHT = TOWER_SEGMENTS.reduce((sum, segment) => sum + segment.height, 0) + TOWER_SPIRE_HEIGHT;
const TOWER_NEON_COLORS = ['#00E5FF', '#D4AF37'];

/**
 * Burj Khalifa-inspired glowing silhouette: a stacked, tapering low-poly
 * tower with neon accent strips on every side, plus a spire and apex beacon.
 * Pure ambient backdrop geometry — no exclusion radius/physics coupling
 * (there's no vehicle to keep out of it anymore).
 */
function CentralTower() {
  const spireGlowRef = useRef<THREE.MeshStandardMaterial>(null);
  const beaconRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const pulse = 3.5 + Math.sin(state.clock.elapsedTime * 2) * 1.5;
    if (spireGlowRef.current) spireGlowRef.current.emissiveIntensity = pulse;
    if (beaconRef.current) beaconRef.current.intensity = 40 + pulse * 6;
  });

  let cumulativeHeight = 0;
  const segments = TOWER_SEGMENTS.map((segment) => {
    const y = cumulativeHeight;
    cumulativeHeight += segment.height;
    return { ...segment, y };
  });
  const baseSegment = TOWER_SEGMENTS[0];

  return (
    <group position={CENTRAL_TOWER_POSITION}>
      {segments.map((segment, index) => (
        <group key={index} position={[0, segment.y, 0]}>
          <mesh position={[0, segment.height / 2, 0]} castShadow={false}>
            <boxGeometry args={[segment.width, segment.height, segment.depth]} />
            <meshPhysicalMaterial {...GLASS_TOWER_MATERIAL_PROPS} envMapIntensity={1.8} />
          </mesh>
          {(['+x', '-x', '+z', '-z'] as const).map((face) => {
            const isXFace = face.includes('x');
            const sign = face.startsWith('+') ? 1 : -1;
            const position: [number, number, number] = isXFace
              ? [sign * (segment.width / 2 + 0.02), segment.height / 2, 0]
              : [0, segment.height / 2, sign * (segment.depth / 2 + 0.02)];
            const rotationY = isXFace ? Math.PI / 2 : 0;
            const stripWidth = (isXFace ? segment.depth : segment.width) * 0.6;

            return (
              <mesh key={face} position={position} rotation={[0, rotationY, 0]}>
                <planeGeometry args={[stripWidth, segment.height * 0.5]} />
                <meshStandardMaterial
                  color={TOWER_NEON_COLORS[index % TOWER_NEON_COLORS.length]}
                  emissive={TOWER_NEON_COLORS[index % TOWER_NEON_COLORS.length]}
                  emissiveIntensity={2}
                  toneMapped={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      <mesh position={[0, cumulativeHeight + TOWER_SPIRE_HEIGHT / 2, 0]} castShadow={false}>
        <coneGeometry args={[1.4, TOWER_SPIRE_HEIGHT, 8]} />
        <meshStandardMaterial ref={spireGlowRef} color="#F5EFE0" emissive="#D4AF37" emissiveIntensity={3.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, cumulativeHeight + TOWER_SPIRE_HEIGHT + 0.6, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#D4AF37" emissive="#D4AF37" emissiveIntensity={4} toneMapped={false} />
      </mesh>
      <pointLight
        ref={beaconRef}
        position={[0, cumulativeHeight + TOWER_SPIRE_HEIGHT, 0]}
        color="#D4AF37"
        intensity={50}
        distance={70}
        decay={2}
      />

      <FacingText
        position={[0, TOWER_TOTAL_HEIGHT * 0.3, baseSegment.depth / 2 + 0.3]}
        fontSize={1.4}
        color="#00E5FF"
        anchorX="center"
        anchorY="middle"
      >
        RESMART AI
      </FacingText>
    </group>
  );
}

const AI_NODE_LAYERS: Array<{ position: [number, number, number]; color: string; count: number; scale: number }> = [
  { position: [0, 0, 0], color: '#00E5FF', count: 70, scale: 46 },
  { position: [0, 0, 0], color: '#D4AF37', count: 30, scale: 70 },
];

/**
 * Ambient "glowing neon road guide" particles — soft glowing motes drifting
 * around the skyline, standing in for ReSmart AI's autonomous routing
 * network rather than any literal geometry. Built on drei's <Sparkles> (a
 * single cheap point-cloud draw call per layer).
 */
function AINodeParticles() {
  return (
    <>
      {AI_NODE_LAYERS.map((layer, index) => (
        <Sparkles
          key={index}
          position={[layer.position[0], 18, layer.position[2]]}
          count={layer.count}
          scale={layer.scale}
          size={3}
          speed={0.3}
          opacity={0.6}
          color={layer.color}
        />
      ))}
    </>
  );
}

/**
 * Ground-level glow ring per Dubai launch district, arranged around the
 * central tower at the 4 compass points. Driven by the 2D DistrictSelector's
 * hover/select state (threaded down via AmbientScene -> World, since the
 * canvas itself is pointer-events:none and can never receive hover/click
 * directly) — selecting a district brightens its ring; hovering previews a
 * dimmer version without committing the selection.
 */
const DISTRICT_ZONE_POSITIONS: Record<DistrictId, [number, number, number]> = {
  downtown: [0, 0.05, 40],
  'business-bay': [40, 0.05, 0],
  szr: [0, 0.05, -40],
  difc: [-40, 0.05, 0],
};

function DistrictGlowZone({
  position,
  isActive,
  isHovered,
}: {
  position: [number, number, number];
  isActive: boolean;
  isHovered: boolean;
}) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    const targetIntensity = isActive ? 4.5 : isHovered ? 2.2 : 0.4;
    material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetIntensity, 0.08);
  });

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[4, 7, 32]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#00E5FF"
        emissive="#00E5FF"
        emissiveIntensity={0.4}
        toneMapped={false}
        transparent
        opacity={0.65}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function DistrictGlowZones({
  selectedDistrict,
  hoveredDistrict,
}: {
  selectedDistrict?: DistrictId;
  hoveredDistrict?: DistrictId | null;
}) {
  return (
    <>
      {(Object.keys(DISTRICT_ZONE_POSITIONS) as DistrictId[]).map((id) => (
        <DistrictGlowZone
          key={id}
          position={DISTRICT_ZONE_POSITIONS[id]}
          isActive={selectedDistrict === id}
          isHovered={hoveredDistrict === id}
        />
      ))}
    </>
  );
}

/**
 * The "Network Pulse" — a glowing node that loops SEARCH -> MATCH ->
 * TRANSACT -> FULFILL every 6 seconds along a closed Catmull-Rom curve
 * through 4 waypoints around the central tower, standing in for a
 * transaction moving through ReSmart AI's matching/fulfillment pipeline.
 */
const PULSE_WAYPOINTS: Array<{ label: string; position: [number, number, number] }> = [
  { label: 'SEARCH', position: [0, 11, 30] },
  { label: 'MATCH', position: [30, 11, 0] },
  { label: 'TRANSACT', position: [0, 11, -30] },
  { label: 'FULFILL', position: [-30, 11, 0] },
];
const PULSE_PERIOD_SECONDS = 6;

function NetworkPulse() {
  const pulseMeshRef = useRef<THREE.Mesh>(null);
  const pulseLightRef = useRef<THREE.PointLight>(null);

  const pulseCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        PULSE_WAYPOINTS.map((waypoint) => new THREE.Vector3(...waypoint.position)),
        true,
        'catmullrom',
        0.5,
      ),
    [],
  );

  useFrame((state) => {
    const progress = (state.clock.elapsedTime % PULSE_PERIOD_SECONDS) / PULSE_PERIOD_SECONDS;
    const point = pulseCurve.getPointAt(progress);
    pulseMeshRef.current?.position.copy(point);
    pulseLightRef.current?.position.copy(point);
  });

  return (
    <group>
      <mesh ref={pulseMeshRef}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <pointLight ref={pulseLightRef} color="#00E5FF" intensity={20} distance={34} decay={2} />
      {PULSE_WAYPOINTS.map((waypoint) => (
        <FacingText
          key={waypoint.label}
          position={[waypoint.position[0], waypoint.position[1] + 2.2, waypoint.position[2]]}
          fontSize={1.1}
          color="#00E5FF"
          anchorX="center"
          anchorY="middle"
        >
          {waypoint.label}
        </FacingText>
      ))}
    </group>
  );
}

interface WorldProps {
  isMobile: boolean;
  selectedDistrict?: DistrictId;
  hoveredDistrict?: DistrictId | null;
}

/**
 * Cyber-Dubai skyline backdrop: a Burj Khalifa-style central tower
 * silhouette ringed by a light decorative skyline, neon gold/cyan traffic
 * streams racing along Sheikh Zayed Road, ambient "AI network" particle
 * motes, per-district glow zones tied to the DistrictSelector UI, and the
 * looping NetworkPulse. Functional, not purely decorative — the glow zones
 * and pulse visualize real page state/product mechanics rather than just
 * filling space. No driving, no physics.
 */
export const World = memo(function World({ isMobile, selectedDistrict, hoveredDistrict }: WorldProps) {
  return (
    <>
      <CentralTower />
      {!isMobile && <AINodeParticles />}
      {!isMobile && <TrafficStreams />}
      <SkylineBuildings />
      <DistrictGlowZones selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict} />
      <NetworkPulse />
    </>
  );
});
