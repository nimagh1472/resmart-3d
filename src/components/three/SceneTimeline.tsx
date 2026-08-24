'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';

// Scene boundaries (seconds) — matches Phase 02's Act I timing for Scenes
// 01–03 (Scene 04/hero vehicle is out of scope for this slice).
const SCENE_01_END = 2.5;
const SCENE_02_END = 11.5;
const SCENE_03_END = 20;

// Re-tuned for Burj Khalifa's real integrated scale (828m tall, positioned
// at x=80, z=-650 — see HeroLandmarks.tsx). The prior keyframes were built
// around a placeholder/no-hero-asset scene and no longer frame anything
// meaningful now that a real 828-unit-tall object exists to compose around.
const CAMERA_KEYFRAMES = {
  start: { position: new Vector3(0, 200, 700), lookAt: new Vector3(80, 400, -650) },
  reveal: { position: new Vector3(80, 120, 100), lookAt: new Vector3(80, 450, -650) },
  discovery: { position: new Vector3(40, 4, -50), lookAt: new Vector3(60, 100, -400) },
};

const PARALLAX_STRENGTH = 1.6;

/**
 * QA instrument only — lets a reference-frame capture jump straight to a
 * given timeline second (?qaTime=7) instead of waiting on wall-clock replay.
 * Not a new environment/scene feature; doesn't affect normal playback
 * (absent by default, real elapsed time drives everything as before).
 */
function readQaTimeOverride(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('qaTime');
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function useNormalizedPointer() {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return pointer;
}

/**
 * Drives the Scene 01→03 camera choreography off a single elapsed-time
 * clock — a scripted dolly/descent, never a physics- or input-driven rig
 * (per Phase 02's explicit "no gameplay camera" decision). Mouse parallax
 * (Phase 02: "discoverable without a tutorial wall") quietly activates only
 * once Scene 03 begins, matching the storyboard.
 */
export function SceneTimeline() {
  const { camera } = useThree();
  const pointer = useNormalizedPointer();
  const lookAtTarget = useRef(new Vector3().copy(CAMERA_KEYFRAMES.start.lookAt));
  const qaTimeOverride = useRef(readQaTimeOverride());

  useFrame((state) => {
    const t = qaTimeOverride.current ?? state.clock.elapsedTime;

    if (t <= SCENE_01_END) {
      camera.position.copy(CAMERA_KEYFRAMES.start.position);
      lookAtTarget.current.copy(CAMERA_KEYFRAMES.start.lookAt);
    } else if (t <= SCENE_02_END) {
      const progress = easeInOutCubic((t - SCENE_01_END) / (SCENE_02_END - SCENE_01_END));
      camera.position.lerpVectors(CAMERA_KEYFRAMES.start.position, CAMERA_KEYFRAMES.reveal.position, progress);
      lookAtTarget.current.lerpVectors(CAMERA_KEYFRAMES.start.lookAt, CAMERA_KEYFRAMES.reveal.lookAt, progress);
    } else {
      const progress = easeInOutCubic(Math.min(1, (t - SCENE_02_END) / (SCENE_03_END - SCENE_02_END)));
      camera.position.lerpVectors(CAMERA_KEYFRAMES.reveal.position, CAMERA_KEYFRAMES.discovery.position, progress);
      lookAtTarget.current.lerpVectors(CAMERA_KEYFRAMES.reveal.lookAt, CAMERA_KEYFRAMES.discovery.lookAt, progress);

      // Parallax only once Scene 03 has meaningfully begun — quiet, not announced.
      const parallaxStrength = PARALLAX_STRENGTH * progress;
      camera.position.x += pointer.current.x * parallaxStrength * 0.02;
      camera.position.y += -pointer.current.y * parallaxStrength * 0.01;
    }

    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

/**
 * Scene 01's darkness IS the loading buffer (Phase 03) — a full-screen HTML
 * overlay fading out over the SCENE_01_END window, imperatively driven (no
 * per-frame React state) to avoid re-render cost.
 */
export function IntroFade() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const qaTimeOverride = useRef(readQaTimeOverride());

  useFrame((state) => {
    if (!overlayRef.current) return;
    const t = qaTimeOverride.current ?? state.clock.elapsedTime;
    const opacity = t >= SCENE_01_END ? 0 : 1 - easeInOutCubic(Math.max(0, t / SCENE_01_END));
    overlayRef.current.style.opacity = String(opacity);
  });

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div ref={overlayRef} style={{ position: 'fixed', inset: 0, background: '#050709', opacity: 1 }} />
    </Html>
  );
}
