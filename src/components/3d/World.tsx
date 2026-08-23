'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DUBAI_LANDMARKS, WORLD_BOUNDS } from '@/lib/pitchData';
import { FacingText } from '@/components/3d/FacingText';

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
const SKYLINE_NEON_COLORS = ['#facc15', '#a855f7', '#22d3ee'];

function buildEdge(axis: 'x' | 'z', sign: 1 | -1): BuildingConfig[] {
  return Array.from({ length: BUILDINGS_PER_EDGE }, (_, index) => {
    const offset = (index - (BUILDINGS_PER_EDGE - 1) / 2) * EDGE_SPACING;
    const height = 14 + (index % 3) * 8;
    const color = index % 2 === 0 ? '#1e1b3a' : '#171331';
    const neonColor = SKYLINE_NEON_COLORS[index % SKYLINE_NEON_COLORS.length];
    const position: [number, number, number] =
      axis === 'z' ? [offset, 0, sign * EDGE_OFFSET] : [sign * EDGE_OFFSET, 0, offset];

    return { position, width: 8, depth: 8, height, color, neonColor };
  });
}

const SKYLINE_BUILDINGS: BuildingConfig[] = [
  ...buildEdge('z', 1),
  ...buildEdge('z', -1),
  ...buildEdge('x', 1),
  ...buildEdge('x', -1),
];

const BILLBOARDS: BillboardConfig[] = [
  { position: [-12, 0, -20], rotationY: Math.PI * 0.15, label: 'RESMART AI', color: '#a855f7' },
  { position: [12, 0, -20], rotationY: -Math.PI * 0.15, label: 'DRIVE THE FUTURE', color: '#22c55e' },
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
    color: '#0f2438',
    neonColor: '#22d3ee',
  },
  {
    position: [MALL_DISTRICT_CENTER[0] + 16, 0, MALL_DISTRICT_CENTER[2] - 14],
    width: 14,
    depth: 12,
    height: 16,
    color: '#12213a',
    neonColor: '#facc15',
  },
  {
    position: [MALL_DISTRICT_CENTER[0] + 4, 0, MALL_DISTRICT_CENTER[2] + 22],
    width: 10,
    depth: 9,
    height: 12,
    color: '#101c34',
    neonColor: '#a855f7',
  },
];

interface TowerSegmentConfig {
  width: number;
  depth: number;
  height: number;
}

const TOWER_SEGMENTS: TowerSegmentConfig[] = [
  { width: 11, depth: 11, height: 10 },
  { width: 9, depth: 9, height: 9 },
  { width: 7.2, depth: 7.2, height: 9 },
  { width: 5.6, depth: 5.6, height: 8 },
  { width: 4, depth: 4, height: 8 },
  { width: 2.4, depth: 2.4, height: 7 },
];
const TOWER_SPIRE_HEIGHT = 12;
const TOWER_TOTAL_HEIGHT = TOWER_SEGMENTS.reduce((sum, segment) => sum + segment.height, 0) + TOWER_SPIRE_HEIGHT;
const TOWER_NEON_COLORS = ['#facc15', '#22d3ee'];

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

function Building({ position, width, depth, height, color, neonColor }: BuildingConfig) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
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
      <mesh position={[0, 8, 0]} castShadow>
        <boxGeometry args={[9, 4.5, 0.3]} />
        <meshStandardMaterial color="#0f0c29" />
      </mesh>
      <mesh position={[0, 8, 0.19]}>
        <planeGeometry args={[8, 3.5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <FacingText position={[0, 8, 0.22]} fontSize={0.9} color="#0b0a1a" anchorX="center" anchorY="middle" maxWidth={7}>
        {label}
      </FacingText>
      {[-4.2, 4.2].map((x, index) => (
        <mesh key={index} position={[x, 4, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 8, 8]} />
          <meshStandardMaterial color="#1e1b3a" />
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
          <mesh position={[0, segment.height / 2, 0]} castShadow>
            <boxGeometry args={[segment.width, segment.height, segment.depth]} />
            <meshStandardMaterial color="#161335" />
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

      <mesh position={[0, cumulativeHeight + TOWER_SPIRE_HEIGHT / 2, 0]} castShadow>
        <coneGeometry args={[1.4, TOWER_SPIRE_HEIGHT, 8]} />
        <meshStandardMaterial color="#e5e7eb" emissive="#facc15" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, cumulativeHeight + TOWER_SPIRE_HEIGHT + 0.6, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={4} toneMapped={false} />
      </mesh>
      <pointLight
        position={[0, cumulativeHeight + TOWER_SPIRE_HEIGHT, 0]}
        color="#facc15"
        intensity={50}
        distance={70}
        decay={2}
      />

      <FacingText
        position={[0, TOWER_TOTAL_HEIGHT * 0.3, baseSegment.depth / 2 + 0.3]}
        fontSize={1.4}
        color="#facc15"
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
function Boulevard() {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[BOULEVARD_INNER_RADIUS, BOULEVARD_OUTER_RADIUS, 64]} />
        <meshStandardMaterial color="#171331" />
      </mesh>
      {Array.from({ length: BOULEVARD_DASH_COUNT }, (_, index) => {
        if (index % 2 === 1) return null;
        const angle = (index / BOULEVARD_DASH_COUNT) * Math.PI * 2;
        const [x, , z] = polar(BOULEVARD_MID_RADIUS, angle);
        return (
          <mesh key={index} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[0.4, 1.6]} />
            <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function PalmTree({ position, rotationY }: PalmTreeConfig) {
  const frondCount = 6;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 4, 8]} />
        <meshStandardMaterial color="#5c4326" />
      </mesh>
      {Array.from({ length: frondCount }, (_, index) => {
        const frondAngle = (index / frondCount) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.sin(frondAngle) * 0.6, 4.1, Math.cos(frondAngle) * 0.6]}
            rotation={[Math.PI / 3.2, frondAngle, 0]}
          >
            <coneGeometry args={[0.35, 2.2, 4]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
        );
      })}
    </group>
  );
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 5, 8]} />
        <meshStandardMaterial color="#1e1b3a" />
      </mesh>
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 5, 0]} color="#fde68a" intensity={10} distance={14} decay={2} />
    </group>
  );
}

function RoadArrow({ position, rotationY }: RoadArrowConfig) {
  return (
    <mesh position={[position[0], 0.03, position[2]]} rotation={[-Math.PI / 2, 0, rotationY]}>
      <coneGeometry args={[0.6, 1.6, 3]} />
      <meshStandardMaterial
        color="#22d3ee"
        emissive="#22d3ee"
        emissiveIntensity={1.8}
        toneMapped={false}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

/** A small striped traffic barrier marking the boulevard's cardinal approaches — decorative, like the rest of the street dressing. */
function Barrier({ position, rotationY }: RoadArrowConfig) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.2, 1, 0.5]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      {[-0.3, 0.3].map((x, index) => (
        <mesh key={index} position={[x, 0.5, 0.26]}>
          <boxGeometry args={[0.3, 1, 0.02]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
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
        <meshStandardMaterial color="#0c4a6e" />
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

      {PALM_TREES.map((tree, index) => (
        <PalmTree key={index} {...tree} />
      ))}
      {STREET_LAMPS.map((position, index) => (
        <StreetLamp key={index} position={position} />
      ))}
      {ROAD_ARROWS.map((arrow, index) => (
        <RoadArrow key={index} {...arrow} />
      ))}
      {BARRIERS.map((barrier, index) => (
        <Barrier key={index} {...barrier} />
      ))}

      {SKYLINE_BUILDINGS.map((building, index) => (
        <Building key={index} {...building} />
      ))}
      {BILLBOARDS.map((billboard, index) => (
        <Billboard key={index} {...billboard} />
      ))}
    </>
  );
}
