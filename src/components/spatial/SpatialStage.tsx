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
  const { shouldAutoSkip, isSkipControlVisible, skip } = useCinematicSkip();

  const currentBeat = getBeatAtProgress(progress);
  const beatProgress = getBeatProgress(currentBeat, progress);

  useEffect(() => {
    const nextBeat = SPATIAL_BEATS[currentBeat.index]; // 1-based index == next beat's 0-based array position
    const toAdd = [currentBeat.asset?.id, nextBeat?.asset?.id].filter((id): id is string => Boolean(id));
    if (toAdd.every((id) => loadedAssetIds.has(id))) return;
    setLoadedAssetIds((prev) => new Set(Array.from(prev).concat(toAdd)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBeat.key]);

  if (shouldAutoSkip) return null;

  const handleSkip = () => {
    skip();
    onSkip?.();
  };

  const handleSelectPersona = (role: LeadRole) => {
    onSelectPersona?.(role);
    onSkip?.();
  };

  return (
    // z-index above the homepage's fixed BackgroundVideo (z-10) and <main>
    // (z-20) — this is normal in-flow content, not a fixed overlay, so the
    // z-index only matters while it's actually scrolled into view.
    <div ref={wrapperRef} style={{ position: 'relative', zIndex: 30, height: `${SPATIAL_TOTAL_HEIGHT_VH}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#050709' }}>
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
            opacity: isSkipControlVisible ? 1 : 0,
            pointerEvents: isSkipControlVisible ? 'auto' : 'none',
            transition: 'opacity 0.8s ease',
          }}
        >
          Skip →
        </button>
      </div>
    </div>
  );
}
