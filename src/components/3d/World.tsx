'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Line2, LineMaterial } from 'three-stdlib';
import * as THREE from 'three';
import { DUBAI_LANDMARKS, STATIONS, WORLD_BOUNDS } from '@/lib/pitchData';
import { FacingText } from '@/components/3d/FacingText';
import { GLASS_TOWER_MATERIAL_PROPS, BACKGROUND_BUILDING_MATERIAL_PROPS } from '@/components/3d/Environment';

const ASPHALT_COLOR = '#1B2530';
const LANE_GLOW_COLOR = '#00F0FF';

// Scratch objects reused to compose a "group position/rotationY + local
// child position/rotation" transform (matching the nested <group><mesh/>
// hierarchy the old per-instance components used) into a single world
// matrix for InstancedMesh.setMatrixAt — computed once on mount, never
// per-frame, since none of these environmental props animate.
const scratchParent = new THREE.Object3D();
const scratchChild = new THREE.Object3D();
scratchParent.add(scratchChild);

function localToWorldMatrix(
  parentPosition: [number, number, number],
  parentRotationY: number,
  localPosition: [number, number, number],
  localRotation: [number, number, number] = [0, 0, 0],
): THREE.Matrix4 {
  scratchParent.position.set(...parentPosition);
  scratchParent.rotation.set(0, parentRotationY, 0);
  scratchChild.position.set(...localPosition);
  scratchChild.rotation.set(...localRotation);
  scratchParent.updateMatrixWorld(true);
  return scratchChild.matrixWorld;
}

const { CENTRAL_TOWER_POSITION, BOULEVARD_INNER_RADIUS, BOULEVARD_OUTER_RADIUS, MALL_DISTRICT_CENTER, FOUNTAIN_POSITION } =
  DUBAI_LANDMARKS;
const BOULEVARD_MID_RADIUS = (BOULEVARD_INNER_RADIUS + BOULEVARD_OUTER_RADIUS) / 2;

/** Point on a circle of `radius` at `angle` radians, matching Vehicle.tsx's sin(x)/cos(z) heading convention. */
function polar(radius: number, angle: number, y = 0): [number, number, number] {
  return [radius * Math.sin(angle), y, radius * Math.cos(angle)];
}

interface BuildingConfig {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: string;
  neonColor: string;
  /** 'hero' = photoreal transmissive glass (landmarks); 'background' = cheaper opaque metallic glass (repeated filler). */
  tier?: 'hero' | 'background';
}

interface BillboardConfig {
  position: [number, number, number];
  rotationY: number;
  label: string;
  color: string;
}

const EDGE_OFFSET = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / 2 + 15; // strictly outside the walled play area
const BUILDINGS_PER_EDGE = 5;
const EDGE_SPACING = 40;
const SKYLINE_NEON_COLORS = ['#FFD166', '#FF8FA3', '#4ECDC4'];

function buildEdge(axis: 'x' | 'z', sign: 1 | -1): BuildingConfig[] {
  return Array.from({ length: BUILDINGS_PER_EDGE }, (_, index) => {
    const offset = (index - (BUILDINGS_PER_EDGE - 1) / 2) * EDGE_SPACING;
    const height = 14 + (index % 3) * 8;
    const color = index % 2 === 0 ? '#D4F1F9' : '#B8E3ED';
    const neonColor = SKYLINE_NEON_COLORS[index % SKYLINE_NEON_COLORS.length];
    const position: [number, number, number] =
      axis === 'z' ? [offset, 0, sign * EDGE_OFFSET] : [sign * EDGE_OFFSET, 0, offset];

    return { position, width: 8, depth: 8, height, color, neonColor, tier: 'background' as const };
  });
}

const SKYLINE_BUILDINGS: BuildingConfig[] = [
  ...buildEdge('z', 1),
  ...buildEdge('z', -1),
  ...buildEdge('x', 1),
  ...buildEdge('x', -1),
];

const BILLBOARDS: BillboardConfig[] = [
  { position: [-12, 0, -20], rotationY: Math.PI * 0.15, label: 'RESMART AI', color: '#FF8FA3' },
  { position: [12, 0, -20], rotationY: -Math.PI * 0.15, label: 'DRIVE THE FUTURE', color: '#8CE99A' },
];

// Dubai Mall district cluster, offset from MALL_DISTRICT_CENTER (which
// deliberately coincides with the CUSTOMER_STORE station) but kept well
// clear of that station's 6-unit trigger radius and its zone feature.
const MALL_BUILDINGS: BuildingConfig[] = [
  {
    position: [MALL_DISTRICT_CENTER[0] - 18, 0, MALL_DISTRICT_CENTER[2] + 10],
    width: 12,
    depth: 10,
    height: 20,
    color: '#D4F1F9',
    neonColor: '#4ECDC4',
    tier: 'hero',
  },
  {
    position: [MALL_DISTRICT_CENTER[0] + 16, 0, MALL_DISTRICT_CENTER[2] - 14],
    width: 14,
    depth: 12,
    height: 16,
    color: '#C3E9F2',
    neonColor: '#FFD166',
    tier: 'hero',
  },
  {
    position: [MALL_DISTRICT_CENTER[0] + 4, 0, MALL_DISTRICT_CENTER[2] + 22],
    width: 10,
    depth: 9,
    height: 12,
    color: '#B8E3ED',
    neonColor: '#FF8FA3',
    tier: 'hero',
  },
];

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
// Segment heights sum to 28; spire adds 12 more, so the tip lands at Y = 40.
const TOWER_SPIRE_HEIGHT = 12;
// Exported so components/games/InvestorSimulationScene.tsx can place its
// holographic ROI chart precisely above the tower's apex.
export const TOWER_TOTAL_HEIGHT = TOWER_SEGMENTS.reduce((sum, segment) => sum + segment.height, 0) + TOWER_SPIRE_HEIGHT;
const TOWER_NEON_COLORS = ['#FFD166', '#4ECDC4'];

const PALM_TREE_RING_COUNT = 16;
const PALM_TREE_RING_RADIUS = BOULEVARD_OUTER_RADIUS + 5;
const STREET_LAMP_RING_COUNT = 12;
const STREET_LAMP_RING_RADIUS = BOULEVARD_OUTER_RADIUS + 2;
const ROAD_ARROW_COUNT = 8;
const BOULEVARD_DASH_COUNT = 48;

interface PalmTreeConfig {
  position: [number, number, number];
  rotationY: number;
}

const PALM_TREES: PalmTreeConfig[] = Array.from({ length: PALM_TREE_RING_COUNT }, (_, index) => {
  const angle = (index / PALM_TREE_RING_COUNT) * Math.PI * 2;
  return { position: polar(PALM_TREE_RING_RADIUS, angle), rotationY: angle };
});

const STREET_LAMPS: Array<[number, number, number]> = Array.from({ length: STREET_LAMP_RING_COUNT }, (_, index) => {
  const angle = ((index + 0.5) / STREET_LAMP_RING_COUNT) * Math.PI * 2;
  return polar(STREET_LAMP_RING_RADIUS, angle);
});

interface RoadArrowConfig {
  position: [number, number, number];
  rotationY: number;
}

const ROAD_ARROWS: RoadArrowConfig[] = Array.from({ length: ROAD_ARROW_COUNT }, (_, index) => {
  const angle = (index / ROAD_ARROW_COUNT) * Math.PI * 2;
  // Points tangentially along the boulevard's direction of travel.
  return { position: polar(BOULEVARD_MID_RADIUS, angle), rotationY: angle + Math.PI / 2 };
});

// Barrier pairs flanking the boulevard's four cardinal approaches into the
// Central Tower roundabout.
const BARRIERS: RoadArrowConfig[] = [0, 1, 2, 3].flatMap((cardinal) => {
  const baseAngle = (cardinal / 4) * Math.PI * 2;
  return [-0.14, 0.14].map((spread) => ({
    position: polar(BOULEVARD_INNER_RADIUS - 1.5, baseAngle + spread),
    rotationY: baseAngle,
  }));
});

function Building({ position, width, depth, height, color, neonColor, tier = 'background' }: BuildingConfig) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow={false}>
        <boxGeometry args={[width, height, depth]} />
        {tier === 'hero' ? (
          <meshPhysicalMaterial {...GLASS_TOWER_MATERIAL_PROPS} color={color} />
        ) : (
          <meshStandardMaterial {...BACKGROUND_BUILDING_MATERIAL_PROPS} color={color} />
        )}
      </mesh>
      {[0.3, 0.55, 0.8].map((fraction, index) => (
        <mesh key={index} position={[0, height * fraction, depth / 2 + 0.02]}>
          <boxGeometry args={[width * 0.7, 0.3, 0.05]} />
          <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.6, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Billboard({ position, rotationY, label, color }: BillboardConfig) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 8, 0]} castShadow={false}>
        <boxGeometry args={[9, 4.5, 0.3]} />
        <meshStandardMaterial color="#7C5C42" />
      </mesh>
      <mesh position={[0, 8, 0.19]}>
        <planeGeometry args={[8, 3.5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <FacingText position={[0, 8, 0.22]} fontSize={0.9} color="#3A2E22" anchorX="center" anchorY="middle" maxWidth={7}>
        {label}
      </FacingText>
      {[-4.2, 4.2].map((x, index) => (
        <mesh key={index} position={[x, 4, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 8, 8]} />
          <meshStandardMaterial color="#7C5C42" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Burj Khalifa-inspired central landmark: a stacked, tapering low-poly tower
 * with neon accent strips on every side (so it reads correctly no matter
 * which way the boulevard is approached from) plus a spire and apex beacon.
 * Sits inside the drivable area at the middle of the boulevard roundabout —
 * Vehicle.tsx keeps the vehicle out of DUBAI_LANDMARKS.CENTRAL_TOWER_EXCLUSION_RADIUS
 * around this same position (a physics collider would do nothing here, since
 * the vehicle is a fully scripted kinematic body — see Vehicle.tsx).
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
        <meshStandardMaterial ref={spireGlowRef} color="#F5EFE0" emissive="#FFD166" emissiveIntensity={3.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, cumulativeHeight + TOWER_SPIRE_HEIGHT + 0.6, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={4} toneMapped={false} />
      </mesh>
      <pointLight
        ref={beaconRef}
        position={[0, cumulativeHeight + TOWER_SPIRE_HEIGHT, 0]}
        color="#FFD166"
        intensity={50}
        distance={70}
        decay={2}
      />

      <FacingText
        position={[0, TOWER_TOTAL_HEIGHT * 0.3, baseSegment.depth / 2 + 0.3]}
        fontSize={1.4}
        color="#7C5C42"
        anchorX="center"
        anchorY="middle"
      >
        CENTRAL TOWER
      </FacingText>
    </group>
  );
}

/**
 * A curved, ring-shaped boulevard (inspired by Sheikh Mohammed bin Rashid
 * Boulevard) circling the Central Tower — a flat decorative road surface
 * with dashed lane markings. Purely visual: the solid Ground plane
 * underneath already handles physics everywhere.
 */
const BOULEVARD_DASHES = Array.from({ length: BOULEVARD_DASH_COUNT }, (_, index) => index)
  .filter((index) => index % 2 === 0)
  .map((index) => {
    const angle = (index / BOULEVARD_DASH_COUNT) * Math.PI * 2;
    const [x, , z] = polar(BOULEVARD_MID_RADIUS, angle);
    return { x, z, angle };
  });

function Boulevard() {
  const dashRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = dashRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    BOULEVARD_DASHES.forEach((dash, index) => {
      dummy.position.set(dash.x, 0.01, dash.z);
      dummy.rotation.set(-Math.PI / 2, 0, dash.angle);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group position={[0, 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[BOULEVARD_INNER_RADIUS, BOULEVARD_OUTER_RADIUS, 64]} />
        <meshStandardMaterial color={ASPHALT_COLOR} roughness={0.75} metalness={0.15} />
      </mesh>
      <instancedMesh ref={dashRef} args={[undefined, undefined, BOULEVARD_DASHES.length]}>
        <planeGeometry args={[0.4, 1.6]} />
        <meshStandardMaterial color={LANE_GLOW_COLOR} emissive={LANE_GLOW_COLOR} emissiveIntensity={2.5} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

const PALM_FROND_COUNT = 6;

/**
 * All palm trees rendered as two InstancedMeshes (trunks, fronds) instead of
 * one draw call per tree/frond — instance transforms are computed once on
 * mount via localToWorldMatrix (trees never move) rather than per-frame.
 */
function PalmTrees() {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const frondRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const trunk = trunkRef.current;
    const frond = frondRef.current;
    if (!trunk || !frond) return;

    let frondIndex = 0;
    PALM_TREES.forEach((tree, treeIndex) => {
      trunk.setMatrixAt(treeIndex, localToWorldMatrix(tree.position, tree.rotationY, [0, 2, 0]));

      for (let f = 0; f < PALM_FROND_COUNT; f += 1) {
        const frondAngle = (f / PALM_FROND_COUNT) * Math.PI * 2;
        const localPosition: [number, number, number] = [
          Math.sin(frondAngle) * 0.6,
          4.1,
          Math.cos(frondAngle) * 0.6,
        ];
        frond.setMatrixAt(frondIndex, localToWorldMatrix(tree.position, tree.rotationY, localPosition, [Math.PI / 3.2, frondAngle, 0]));
        frondIndex += 1;
      }
    });

    trunk.instanceMatrix.needsUpdate = true;
    frond.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, PALM_TREE_RING_COUNT]} castShadow={false}>
        <cylinderGeometry args={[0.18, 0.28, 4, 8]} />
        <meshStandardMaterial color="#5c4326" />
      </instancedMesh>
      <instancedMesh ref={frondRef} args={[undefined, undefined, PALM_TREE_RING_COUNT * PALM_FROND_COUNT]}>
        <coneGeometry args={[0.35, 2.2, 4]} />
        <meshStandardMaterial color="#15803d" />
      </instancedMesh>
    </>
  );
}

/** All street lamps as two InstancedMeshes (poles, bulbs); point lights stay per-lamp since lights can't be instanced. */
function StreetLamps() {
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const bulbRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const pole = poleRef.current;
    const bulb = bulbRef.current;
    if (!pole || !bulb) return;

    STREET_LAMPS.forEach((position, index) => {
      pole.setMatrixAt(index, localToWorldMatrix(position, 0, [0, 2.5, 0]));
      bulb.setMatrixAt(index, localToWorldMatrix(position, 0, [0, 5, 0]));
    });
    pole.instanceMatrix.needsUpdate = true;
    bulb.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <>
      <instancedMesh ref={poleRef} args={[undefined, undefined, STREET_LAMP_RING_COUNT]} castShadow={false}>
        <cylinderGeometry args={[0.08, 0.1, 5, 8]} />
        <meshStandardMaterial color="#7C5C42" />
      </instancedMesh>
      <instancedMesh ref={bulbRef} args={[undefined, undefined, STREET_LAMP_RING_COUNT]}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={2.5} toneMapped={false} />
      </instancedMesh>
      {STREET_LAMPS.map((position, index) => (
        <pointLight key={index} position={[position[0], 5, position[2]]} color="#fde68a" intensity={10} distance={14} decay={2} />
      ))}
    </>
  );
}

/** All boulevard direction arrows as a single InstancedMesh. */
function RoadArrows() {
  const arrowRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = arrowRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    ROAD_ARROWS.forEach((arrow, index) => {
      dummy.position.set(arrow.position[0], 0.03, arrow.position[2]);
      dummy.rotation.set(-Math.PI / 2, 0, arrow.rotationY);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={arrowRef} args={[undefined, undefined, ROAD_ARROW_COUNT]}>
      <coneGeometry args={[0.6, 1.6, 3]} />
      <meshStandardMaterial
        color={LANE_GLOW_COLOR}
        emissive={LANE_GLOW_COLOR}
        emissiveIntensity={1.8}
        toneMapped={false}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  );
}

/** All striped traffic barriers marking the boulevard's cardinal approaches, as two InstancedMeshes (bodies, stripes). */
function Barriers() {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const stripeRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const body = bodyRef.current;
    const stripe = stripeRef.current;
    if (!body || !stripe) return;

    let stripeIndex = 0;
    BARRIERS.forEach((barrier, index) => {
      body.setMatrixAt(index, localToWorldMatrix(barrier.position, barrier.rotationY, [0, 0.5, 0]));
      [-0.3, 0.3].forEach((x) => {
        stripe.setMatrixAt(stripeIndex, localToWorldMatrix(barrier.position, barrier.rotationY, [x, 0.5, 0.26]));
        stripeIndex += 1;
      });
    });
    body.instanceMatrix.needsUpdate = true;
    stripe.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, BARRIERS.length]} castShadow={false}>
        <boxGeometry args={[1.2, 1, 0.5]} />
        <meshStandardMaterial color="#f8fafc" />
      </instancedMesh>
      <instancedMesh ref={stripeRef} args={[undefined, undefined, BARRIERS.length * 2]}>
        <boxGeometry args={[0.3, 1, 0.02]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.5} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/**
 * Dubai Fountain-inspired water feature: a circular basin with jets that bob
 * up and down via useFrame, near the Dubai Mall district.
 */
function Fountain() {
  const jetRefs = useRef<THREE.Mesh[]>([]);
  const jetCount = 8;

  useFrame((state) => {
    jetRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      mesh.position.y = 0.6 + Math.sin(state.clock.elapsedTime * 2.4 + index) * 0.35;
    });
  });

  return (
    <group position={FOUNTAIN_POSITION}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#5DADE2" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[4.6, 5, 32]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {Array.from({ length: jetCount }, (_, index) => {
        const angle = (index / jetCount) * Math.PI * 2;
        const [x, , z] = polar(3, angle);
        return (
          <mesh
            key={index}
            ref={(mesh) => {
              if (mesh) jetRefs.current[index] = mesh;
            }}
            position={[x, 0.6, z]}
          >
            <cylinderGeometry args={[0.08, 0.14, 1.2, 8]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={2}
              toneMapped={false}
              transparent
              opacity={0.75}
            />
          </mesh>
        );
      })}
      <FacingText position={[0, 1.6, 5.6]} fontSize={0.7} color="#38bdf8" anchorX="center" anchorY="middle">
        DUBAI FOUNTAIN
      </FacingText>
    </group>
  );
}

/** Glassy mall cluster + fountain, off to one side of the CUSTOMER_STORE station. */
function MallDistrict() {
  return (
    <>
      {MALL_BUILDINGS.map((building, index) => (
        <Building key={index} {...building} />
      ))}
      <Fountain />
      <FacingText
        position={[MALL_DISTRICT_CENTER[0], 9, MALL_DISTRICT_CENTER[2] + 26]}
        fontSize={1.1}
        color="#facc15"
        anchorX="center"
        anchorY="middle"
      >
        DUBAI MALL DISTRICT
      </FacingText>
    </>
  );
}

const ROUTE_HEIGHT = 5;
const ROUTE_ARC_POINTS = 24;

function stationPosition(id: string): THREE.Vector3 {
  const station = STATIONS.find((entry) => entry.id === id);
  return new THREE.Vector3(...(station?.position ?? [0, 0, 0]));
}

function buildArcPoints(fromId: string, toId: string): THREE.Vector3[] {
  const start = stationPosition(fromId).setY(1.5);
  const end = stationPosition(toId).setY(1.5);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.y = ROUTE_HEIGHT;
  return new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(ROUTE_ARC_POINTS);
}

const ROUTE_DEFS: Array<{ id: string; pairs: Array<[string, string]>; color: string }> = [
  { id: 'customer', pairs: [['CUSTOMER_STORE', 'CUSTOMER_EXPRESS']], color: LANE_GLOW_COLOR },
  {
    id: 'agent',
    pairs: [
      ['AGENT_DISPATCH', 'AGENT_VERIFY'],
      ['AGENT_VERIFY', 'AGENT_DROPOFF'],
    ],
    color: LANE_GLOW_COLOR,
  },
];

/**
 * Animated glowing delivery routes: curved cyan/emerald arcs (bright,
 * unlit, toneMapped=false so Environment.tsx's Bloom picks them up) linking
 * each role's waypoints, with a scrolling dash pattern (dashOffset animated
 * every frame) so the route visibly "flows" toward its destination and a
 * slow opacity pulse for a breathing glow.
 */
function DeliveryRoutes() {
  const routes = useMemo(
    () =>
      ROUTE_DEFS.flatMap((route) =>
        route.pairs.map(([from, to], index) => ({
          key: `${route.id}-${index}`,
          points: buildArcPoints(from, to),
          color: route.color,
        })),
      ),
    [],
  );

  return (
    <>
      {routes.map((route) => (
        <GlowingRoute key={route.key} points={route.points} color={route.color} />
      ))}
    </>
  );
}

function GlowingRoute({ points, color }: { points: THREE.Vector3[]; color: string }) {
  const lineRef = useRef<Line2>(null);
  const glowColor = useMemo(() => new THREE.Color(color).multiplyScalar(5.0), [color]);

  useFrame((state, delta) => {
    const material = lineRef.current?.material as LineMaterial | undefined;
    if (!material) return;
    material.dashOffset -= delta * 1.5;
    material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2.4) * 0.25;
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      color={glowColor}
      lineWidth={3}
      dashed
      dashSize={1.2}
      gapSize={0.7}
      transparent
      opacity={0.8}
      toneMapped={false}
    />
  );
}

const PIN_STATION_IDS = ['CUSTOMER_STORE', 'AGENT_VERIFY', 'AGENT_DROPOFF'] as const;
const PIN_HEIGHT = 11;
const PIN_COLORS: Record<string, string> = {
  CUSTOMER_STORE: '#22d3ee',
  AGENT_VERIFY: '#a855f7',
  AGENT_DROPOFF: '#34d399',
};

/**
 * Floating neon location pin hovering above a store hub / merchant test
 * bench / drop-off point — bobs and slowly spins, and glows under Bloom via
 * an overbright (>1 component) unlit color.
 */
function LocationPin({ position, color }: { position: [number, number, number]; color: string }) {
  const bobRef = useRef<THREE.Group>(null);
  const glow = useMemo(() => new THREE.Color(color).multiplyScalar(2.2), [color]);

  useFrame((state) => {
    if (!bobRef.current) return;
    bobRef.current.position.y = PIN_HEIGHT + Math.sin(state.clock.elapsedTime * 1.6) * 0.5;
    bobRef.current.rotation.y += 0.01;
  });

  return (
    <group position={position}>
      <group ref={bobRef}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.7, 1.4, 4]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial
            color={glow}
            emissive={glow}
            emissiveIntensity={2.5}
            toneMapped={false}
            transparent
            opacity={0.9}
          />
        </mesh>
        <pointLight color={color} intensity={12} distance={16} decay={2} />
      </group>
    </group>
  );
}

function LocationPins() {
  return (
    <>
      {PIN_STATION_IDS.map((id) => {
        const station = STATIONS.find((entry) => entry.id === id);
        if (!station) return null;
        return <LocationPin key={id} position={station.position} color={PIN_COLORS[id]} />;
      })}
    </>
  );
}

/**
 * Downtown Dubai-inspired dense city layout: a Burj Khalifa-style central
 * tower ringed by a curved boulevard, a Dubai Mall/Fountain district, and
 * procedural street dressing (palm trees, lamps, direction arrows,
 * barriers), plus the original decorative outer skyline ringing
 * WORLD_BOUNDS. Every label goes through FacingText so it reads correctly
 * from either driving direction.
 */
export function World() {
  return (
    <>
      <CentralTower />
      <Boulevard />
      <MallDistrict />
      <DeliveryRoutes />
      <LocationPins />

      <PalmTrees />
      <StreetLamps />
      <RoadArrows />
      <Barriers />

      {SKYLINE_BUILDINGS.map((building, index) => (
        <Building key={index} {...building} />
      ))}
      {BILLBOARDS.map((billboard, index) => (
        <Billboard key={index} {...billboard} />
      ))}
    </>
  );
}
