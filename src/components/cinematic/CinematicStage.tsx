'use client';

import { useEffect, useMemo } from 'react';
import { SCENES, getSceneAtTime, getSceneProgress, type MediaSlot } from '@/lib/cinematicManifest';
import { useCinematicClock } from '@/hooks/useCinematicClock';
import { useCinematicSkip } from '@/hooks/useCinematicSkip';
import { useCinematicAudio } from '@/hooks/useCinematicAudio';
import { MediaLayer } from '@/components/cinematic/MediaLayer';
import { EffectsOverlay } from '@/components/cinematic/EffectsOverlay';
import { BrandRevealText } from '@/components/cinematic/BrandRevealText';

// Every unique media slot across all scenes, deduped by id — rendered
// permanently (opacity-toggled, not mounted/unmounted) so a slot reused
// across consecutive scenes (e.g. the network shot spanning Scenes 07-08)
// crossfades smoothly instead of flickering on remount.
function getUniqueSlots(): MediaSlot[] {
  const seen = new Map<string, MediaSlot>();
  SCENES.forEach((scene) => scene.media.forEach((slot) => seen.set(slot.id, slot)));
  return Array.from(seen.values());
}

interface CinematicStageProps {
  /** Called once the cinematic ends (or is skipped) — the caller mounts the business site. */
  onComplete: () => void;
}

/**
 * The authored-imagery cinematic hero — see src/lib/cinematicManifest.ts
 * for scene timing/media and src/components/three/ARCHIVED.md for what
 * this replaces. Scenes 01-10; Scene 11 (business site) is the caller's
 * responsibility via onComplete, matching the existing site's own
 * isolation conventions.
 */
export function CinematicStage({ onComplete }: CinematicStageProps) {
  const uniqueSlots = useMemo(getUniqueSlots, []);
  const { shouldAutoSkip, isSkipControlVisible, isSkipped, skip } = useCinematicSkip();
  const elapsed = useCinematicClock({ paused: isSkipped });
  const currentScene = getSceneAtTime(elapsed);
  const sceneProgress = getSceneProgress(currentScene, elapsed);
  useCinematicAudio(currentScene.key);
  const isFinished = shouldAutoSkip || isSkipped || elapsed >= SCENES[SCENES.length - 1].end;

  useEffect(() => {
    if (isFinished) onComplete();
  }, [isFinished, onComplete]);

  if (isFinished) return null;

  const activeSlotIds = new Set(currentScene.media.map((slot) => slot.id));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#050709', overflow: 'hidden' }}>
      {uniqueSlots.map((slot, index) => (
        <MediaLayer
          key={slot.id}
          slot={slot}
          opacity={activeSlotIds.has(slot.id) ? 1 : 0}
          elapsed={elapsed}
          priority={index === 0}
        />
      ))}

      <EffectsOverlay scene={currentScene} progress={sceneProgress} />

      {currentScene.key === 'black' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#050709',
            opacity: 1 - sceneProgress,
          }}
        />
      )}

      {currentScene.key === 'brand-reveal' && <BrandRevealText progress={sceneProgress} />}

      <button
        onClick={skip}
        aria-label="Skip intro"
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 999,
          color: 'rgba(255,255,255,0.7)',
          fontSize: 12,
          padding: '8px 16px',
          cursor: 'pointer',
          opacity: isSkipControlVisible ? 1 : 0,
          pointerEvents: isSkipControlVisible ? 'auto' : 'none',
          transition: 'opacity 0.8s ease',
        }}
      >
        Skip →
      </button>
    </div>
  );
}
