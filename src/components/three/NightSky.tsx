'use client';

import { useMemo } from 'react';
import { BackSide, ShaderMaterial, Color, BufferGeometry, Float32BufferAttribute } from 'three';

const ZENITH_COLOR = new Color('#050810');
const HORIZON_COLOR = new Color('#4a3420');
const SKY_RADIUS = 900;

const skyVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 zenithColor;
  uniform vec3 horizonColor;
  varying vec3 vWorldPosition;
  void main() {
    float heightFactor = clamp(normalize(vWorldPosition).y * 1.4 + 0.15, 0.0, 1.0);
    vec3 color = mix(horizonColor, zenithColor, smoothstep(0.0, 1.0, heightFactor));
    gl_FragColor = vec4(color, 1.0);
  }
`;

function useStarField(count: number) {
  return useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = SKY_RADIUS * 0.95;
      const theta = Math.random() * Math.PI * 2;
      // Upper hemisphere only, biased away from the horizon so stars read
      // as sky detail, not a horizon-hugging haze of dots.
      const phi = Math.random() * Math.PI * 0.4;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geometry;
  }, [count]);
}

/**
 * A procedural, geographically-neutral night sky — a vertical gradient dome
 * (dark obsidian zenith to a warm amber horizon glow, evoking distant city
 * light pollution without depicting any specific real place) plus a sparse
 * star field. Replaces the earlier attempt to use the Shanghai Bund HDRI as
 * a visible background, which QA correctly rejected (it read as an
 * unmistakable, wrong, real location). The Shanghai HDRI remains in the
 * scene ONLY for lighting/reflections (see DubaiEnvironment.tsx's
 * background={false}) — never rendered directly.
 */
export function NightSky() {
  const starGeometry = useStarField(400);

  const skyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          zenithColor: { value: ZENITH_COLOR },
          horizonColor: { value: HORIZON_COLOR },
        },
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        side: BackSide,
        depthWrite: false,
      }),
    [],
  );

  return (
    <>
      <mesh material={skyMaterial} renderOrder={-1}>
        <sphereGeometry args={[SKY_RADIUS, 32, 16]} />
      </mesh>
      <points geometry={starGeometry} renderOrder={-1}>
        <pointsMaterial color="#fff4e0" size={1.4} sizeAttenuation={false} transparent opacity={0.55} depthWrite={false} />
      </points>
    </>
  );
}
