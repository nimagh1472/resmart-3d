'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { getSlotWindow, type MediaSlot } from '@/lib/cinematicManifest';
import { CINEMATIC_ASSETS } from '@/lib/cinematicAssets';
import { PlaceholderMedia } from '@/components/cinematic/PlaceholderMedia';
import { useParallaxPointer } from '@/hooks/useParallaxPointer';

// How strongly each depth layer responds to pointer parallax — deeper
// (background) layers move least, closer (foreground) layers move most,
// matching real cinematographic depth-of-field parallax rather than a
// game-like free-look effect. Deliberately restrained per the pivot
// directive ("this is not a 2.5D game — cinematic parallax").
const PARALLAX_STRENGTH: Record<MediaSlot['layer'], number> = {
  background: 4,
  midground: 8,
  hero: 12,
  foreground: 20,
  effects: 6,
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

interface MediaLayerProps {
  slot: MediaSlot;
  /** 0–1 opacity driven by the parent scene's crossfade progress. */
  opacity: number;
  /** Global cinematic clock (seconds) — Ken Burns runs on the slot's own active window, not per-scene. */
  elapsed: number;
  /** Fetch this slot's image eagerly (its scene starts almost immediately). */
  priority?: boolean;
}

export function MediaLayer({ slot, opacity, elapsed, priority }: MediaLayerProps) {
  const pointer = useParallaxPointer();
  const kenBurnsRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const resolvedUrl = CINEMATIC_ASSETS[slot.id];
  const window_ = getSlotWindow(slot.id);

  useEffect(() => {
    const strength = PARALLAX_STRENGTH[slot.layer];
    let frame: number;
    const apply = () => {
      if (parallaxRef.current) {
        const x = pointer.current.x * strength;
        const y = pointer.current.y * strength * 0.6;
        parallaxRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      frame = requestAnimationFrame(apply);
    };
    frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  }, [pointer, slot.layer]);

  const duration = window_.end - window_.start;
  const windowProgress = duration > 0 ? Math.min(1, Math.max(0, (elapsed - window_.start) / duration)) : 0;
  const eased = easeInOutCubic(windowProgress);
  const { zoomFrom, zoomTo, panXFrom, panXTo, panYFrom, panYTo } = slot.kenBurns;
  const scale = lerp(zoomFrom, zoomTo, eased);
  const panX = lerp(panXFrom, panXTo, eased);
  const panY = lerp(panYFrom, panYTo, eased);

  useEffect(() => {
    if (kenBurnsRef.current) {
      kenBurnsRef.current.style.transform = `scale(${scale}) translate(${panX}%, ${panY}%)`;
    }
  }, [scale, panX, panY]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        transition: 'opacity 1.1s ease',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div ref={parallaxRef} style={{ position: 'absolute', inset: '-4%' }}>
        <div ref={kenBurnsRef} style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%' }}>
          {resolvedUrl ? (
            slot.kind === 'video' ? (
              <video
                src={resolvedUrl}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Image
                src={resolvedUrl}
                alt=""
                fill
                sizes="100vw"
                quality={90}
                priority={priority}
                style={{ objectFit: 'cover' }}
              />
            )
          ) : (
            <PlaceholderMedia slot={slot} />
          )}
        </div>
      </div>
    </div>
  );
}
