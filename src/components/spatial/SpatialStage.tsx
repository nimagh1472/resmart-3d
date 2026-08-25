'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SPATIAL_BEATS,
  SPATIAL_TOTAL_HEIGHT_VH,
  getBeatAtProgress,
  getBeatProgress,
  getUniqueAssetSlots,
} from '@/lib/spatialManifest';
import { useSpatialProgress } from '@/hooks/useSpatialProgress';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';
import { useCinematicSkip } from '@/hooks/useCinematicSkip';
import { SpatialLayer } from '@/components/spatial/SpatialLayer';
import { SpatialOverlay } from '@/components/spatial/SpatialOverlay';
import { SpatialText } from '@/components/spatial/SpatialText';
import type { LeadRole } from '@/types';

const UNIQUE_SLOTS = getUniqueAssetSlots();

// How long a persona choice / Skip click takes to dissolve out before the
// (concurrent, smooth) scroll lands on the homepage — long enough to read
// as a deliberate cross-dissolve, short enough not to feel like a wait.
const DISSOLVE_MS = 700;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

interface SpatialStageProps {
  /** Skip clicked or a persona tile chosen — caller scrolls past the intro into the real homepage. */
  onSkip?: () => void;
  /** A persona tile in the closing beat was chosen — caller sets persona state / opens the investor modal. */
  onSelectPersona?: (role: LeadRole) => void;
}

/**
 * Spatial V2 — a scroll-driven, single sticky 100vh stage narrating 13
 * beats over ~13 viewport-heights of scroll (see spatialManifest.ts).
 * Reuses useCinematicSkip verbatim for the same four visitor paths the old
 * cinematic used (intent-routed, returning, reduced-motion, first-time) —
 * unlike that overlay-based intro, this is normal in-flow page content, so
 * "skip" doesn't unmount anything, it just scrolls past it (via onSkip);
 * a returning/bypassed visitor never renders the tall spacer at all.
 */
export function SpatialStage({ onSkip, onSelectPersona }: SpatialStageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress = useSpatialProgress(wrapperRef);
  const isDesktop = useIsDesktopViewport();
  const [loadedAssetIds, setLoadedAssetIds] = useState<Set<string>>(() => new Set());
  const [isDissolving, setIsDissolving] = useState(false);
  const { shouldAutoSkip, isSkipControlVisible, skip } = useCinematicSkip();

  const currentBeat = getBeatAtProgress(progress);
  const beatProgress = getBeatProgress(currentBeat, progress);

  // Signature Dubai onward reads as the gateway into the homepage: the
  // stage itself fades out over the sequence's final stretch, so scrolling
  // straight past it (no persona chosen) dissolves into Hero rather than
  // the sticky stage just abruptly un-sticking.
  const endFadeOpacity = 1 - smoothstep((progress - 0.95) / 0.05);
  const stageOpacity = isDissolving ? 0 : endFadeOpacity;

  useEffect(() => {
    const nextBeat = SPATIAL_BEATS[currentBeat.index]; // 1-based index == next beat's 0-based array position
    const toAdd = [currentBeat.asset?.id, nextBeat?.asset?.id].filter((id): id is string => Boolean(id));
    if (toAdd.every((id) => loadedAssetIds.has(id))) return;
    setLoadedAssetIds((prev) => new Set(Array.from(prev).concat(toAdd)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBeat.key]);

  if (shouldAutoSkip) return null;

  // Both paths dissolve the stage out while concurrently starting the
  // smooth scroll into the homepage — a coordinated fade+scroll instead
  // of an instant cut.
  const handleSkip = () => {
    if (isDissolving) return;
    skip();
    setIsDissolving(true);
    onSkip?.();
  };

  const handleSelectPersona = (role: LeadRole) => {
    if (isDissolving) return;
    setIsDissolving(true);
    onSelectPersona?.(role);
    onSkip?.();
  };

  return (
    // z-index above the homepage's fixed BackgroundVideo (z-10) and <main>
    // (z-20) — this is normal in-flow content, not a fixed overlay, so the
    // z-index only matters while it's actually scrolled into view.
    <div ref={wrapperRef} style={{ position: 'relative', zIndex: 30, height: `${SPATIAL_TOTAL_HEIGHT_VH}vh` }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          background: '#050709',
          opacity: stageOpacity,
          pointerEvents: isDissolving ? 'none' : 'auto',
          transition: isDissolving ? `opacity ${DISSOLVE_MS}ms ease` : 'none',
        }}
      >
        {UNIQUE_SLOTS.map((slot) => (
          <SpatialLayer
            key={slot.id}
            slot={slot}
            opacity={currentBeat.asset?.id === slot.id ? 1 : 0}
            progress={progress}
            isDesktop={isDesktop}
            shouldLoad={loadedAssetIds.has(slot.id)}
          />
        ))}

        <SpatialOverlay beat={currentBeat} beatProgress={beatProgress} isDesktop={isDesktop} />
        <SpatialText beat={currentBeat} beatProgress={beatProgress} onSelectPersona={handleSelectPersona} />

        <button
          onClick={handleSkip}
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
    </div>
  );
}
