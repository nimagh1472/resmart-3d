'use client';

import { useEffect, useRef } from 'react';
import { getAssetWindow, type SpatialAssetSlot } from '@/lib/spatialManifest';
import { SPATIAL_ASSETS } from '@/lib/spatialAssets';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// Fraction-of-sequence equivalent of cinematicManifest's KEN_BURNS_BLEED_SECONDS
// — the motion for a beat starts warming up slightly before it's scrolled
// into (and keeps drifting slightly after) so nothing sits frozen at the
// exact instant it crosses into/out of view.
const KEN_BURNS_BLEED = 0.01;

interface SpatialLayerProps {
  slot: SpatialAssetSlot;
  opacity: number;
  /** Global scroll progress (0-1) — Ken Burns runs on the asset's own window, not per-beat. */
  progress: number;
  isDesktop: boolean;
  /** Preload gate — only current + next beat's asset actually gets an img src. */
  shouldLoad: boolean;
}

export function SpatialLayer({ slot, opacity, progress, isDesktop, shouldLoad }: SpatialLayerProps) {
  const kenBurnsRef = useRef<HTMLDivElement>(null);
  const framing = isDesktop ? slot.desktop : slot.mobile;
  const url = SPATIAL_ASSETS[slot.id]?.[isDesktop ? 'desktop' : 'mobile'];

  const rawWindow = getAssetWindow(slot.id);
  const windowStart = rawWindow.start - KEN_BURNS_BLEED;
  const windowEnd = rawWindow.end + KEN_BURNS_BLEED;
  const duration = windowEnd - windowStart;
  const windowProgress = duration > 0 ? Math.min(1, Math.max(0, (progress - windowStart) / duration)) : 0;
  const eased = easeInOutCubic(windowProgress);

  const { zoomFrom, zoomTo, panXFrom, panXTo, panYFrom, panYTo } = framing.kenBurns;
  const scale = lerp(zoomFrom, zoomTo, eased);
  const panX = lerp(panXFrom, panXTo, eased);
  const panY = lerp(panYFrom, panYTo, eased);

  useEffect(() => {
    if (kenBurnsRef.current) {
      kenBurnsRef.current.style.transform = `scale(${scale}) translate(${panX}%, ${panY}%)`;
    }
  }, [scale, panX, panY]);

  // Overscan margin needed as Ken Burns buffer — 0 for slots that don't
  // zoom/pan (e.g. Network, whose dense edge-to-edge dashboard can't
  // afford the crop), the usual 4% otherwise.
  const overscan = slot.overscanPercent ?? 4;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        transition: 'opacity 1.2s cubic-bezier(0.22, 0, 0.18, 1)',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: `-${overscan}%` }}>
        <div ref={kenBurnsRef} style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%' }}>
          {shouldLoad && url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: framing.objectPosition,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
