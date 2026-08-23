'use client';

import { WORLD_BOUNDS } from '@/lib/pitchData';
import { FacingText } from '@/components/3d/FacingText';

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

function buildEdge(axis: 'x' | 'z', sign: 1 | -1): BuildingConfig[] {
  return Array.from({ length: BUILDINGS_PER_EDGE }, (_, index) => {
    const offset = (index - (BUILDINGS_PER_EDGE - 1) / 2) * EDGE_SPACING;
    const height = 14 + (index % 3) * 8;
    const isEven = index % 2 === 0;
    const color = isEven ? '#1e1b3a' : '#171331';
    const neonColor = isEven ? '#a855f7' : '#22c55e';
    const position: [number, number, number] =
      axis === 'z' ? [offset, 0, sign * EDGE_OFFSET] : [sign * EDGE_OFFSET, 0, offset];

    return { position, width: 8, depth: 8, height, color, neonColor };
  });
}

const BUILDINGS: BuildingConfig[] = [
  ...buildEdge('z', 1),
  ...buildEdge('z', -1),
  ...buildEdge('x', 1),
  ...buildEdge('x', -1),
];

const BILLBOARDS: BillboardConfig[] = [
  { position: [-12, 0, -20], rotationY: Math.PI * 0.15, label: 'RESMART AI', color: '#a855f7' },
  { position: [12, 0, -20], rotationY: -Math.PI * 0.15, label: 'DRIVE THE FUTURE', color: '#22c55e' },
];

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
 * Stylized low-poly skyline dressing the outside of the walled play area:
 * procedural buildings ringing WORLD_BOUNDS and a pair of neon entrance
 * billboards. Purely decorative — no physics bodies, no pitch data.
 */
export function World() {
  return (
    <>
      {BUILDINGS.map((building, index) => (
        <Building key={index} {...building} />
      ))}
      {BILLBOARDS.map((billboard, index) => (
        <Billboard key={index} {...billboard} />
      ))}
    </>
  );
}
