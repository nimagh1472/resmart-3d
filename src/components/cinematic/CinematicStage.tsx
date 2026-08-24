'use client';

import { useEffect, useMemo, useState } from 'react';
import { SCENES, getSceneAtTime, getSceneProgress, type MediaSlot } from '@/lib/cinematicManifest';
import { useCinematicClock } from '@/hooks/useCinematicClock';
import { useCinematicSkip } from '@/hooks/useCinematicSkip';
import { useCinematicAudio } from '@/hooks/useCinematicAudio';
import { useIsPortraitViewport } from '@/hooks/useIsPortraitViewport';
import { MediaLayer } from '@/components/cinematic/MediaLayer';
import { EffectsOverlay } from '@/components/cinematic/EffectsOverlay';
import { BrandRevealText } from '@/components/cinematic/BrandRevealText';

// How long the whole stage takes to dissolve away once the film ends (or
// is skipped) before onComplete actually unmounts it — without this the
// site underneath simply appears the instant the cinematic vanishes,
// which reads as "the component disappeared" rather than an intentional
// handoff. Not used for the auto-skip paths (returning visitor, intent
// routing, reduced motion) — those visitors should never see the stage at
// all, so there's nothing to dissolve.
const OUTRO_FADE_MS = 750;

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
  const isPortrait = useIsPortraitViewport();
  const { shouldAutoSkip, isSkipControlVisible, isSkipped, skip } = useCinematicSkip();
  const [isDissolving, setIsDissolving] = useState(false);
  const elapsed = useCinematicClock({ paused: isSkipped });
  const currentScene = getSceneAtTime(elapsed);
  const sceneProgress = getSceneProgress(currentScene, elapsed);
  useCinematicAudio(currentScene.key);

  const naturalEnd = elapsed >= SCENES[SCENES.length - 1].end;
  // A manual skip or reaching the natural end dissolves the stage out over
  // OUTRO_FADE_MS before unmounting — the auto-skip paths (returning
  // visitor, referral routing, reduced motion) unmount immediately since
  // those visitors never see the stage in the first place.
  const shouldDissolve = !shouldAutoSkip && (naturalEnd || isSkipped);

  useEffect(() => {
    if (shouldAutoSkip) {
      onComplete();
      return;
    }
    if (shouldDissolve) {
      setIsDissolving(true);
      const timer = setTimeout(onComplete, OUTRO_FADE_MS);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoSkip, shouldDissolve]);

  useEffect(() => {
    if (shouldAutoSkip) return;
    // This page's scrolling element is the root <html>, not <body> (no
    // overflow is set on either in globals.css) — locking body alone is a
    // no-op here; both must be hidden for the lock to actually hold.
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [shouldAutoSkip]);

  if (shouldAutoSkip) return null;

  const activeSlotIds = new Set(currentScene.media.map((slot) => slot.id));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#050709',
        overflow: 'hidden',
        opacity: isDissolving ? 0 : 1,
        transition: `opacity ${OUTRO_FADE_MS}ms ease`,
      }}
    >
      {uniqueSlots.map((slot, index) => (
        <MediaLayer
          key={slot.id}
          slot={slot}
          opacity={activeSlotIds.has(slot.id) ? 1 : 0}
          elapsed={elapsed}
          priority={index === 0}
          isPortrait={isPortrait}
        />
      ))}

      <EffectsOverlay scene={currentScene} progress={sceneProgress} elapsed={elapsed} />

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
          opacity: isSkipControlVisible && !isDissolving ? 1 : 0,
          pointerEvents: isSkipControlVisible && !isDissolving ? 'auto' : 'none',
          transition: 'opacity 0.8s ease',
        }}
      >
        Skip →
      </button>
    </div>
  );
}
