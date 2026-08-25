'use client';

import { useRef } from 'react';
import { SPATIAL_ASSETS } from '@/lib/spatialAssets';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';
import { useSpatialProgress } from '@/hooks/useSpatialProgress';

const BEATS = ['Product intent', 'AI search', 'Merchant match', 'Price & location', 'Matched.'];
const STEP = 1 / BEATS.length;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Homepage V2 Phase 1, Section 3 — "Find what you want." A short,
 * scroll-driven sequence (reusing useSpatialProgress, the same hook
 * Spatial V2 uses for its sticky stage) rather than a new scroll system.
 * One idea per step; the final "Matched." beat is the section's single
 * glass/intelligence element, not a dashboard card.
 */
export function ShopperStory() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress = useSpatialProgress(wrapperRef);
  const isDesktop = useIsDesktopViewport();
  const url = SPATIAL_ASSETS.shopper[isDesktop ? 'desktop' : 'mobile'];
  const activeIndex = Math.min(BEATS.length - 1, Math.floor(progress / STEP));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: '400vh' }}>
      <section className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden bg-[#050709]">
        <div className="absolute inset-[-4%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/80" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
          <h2 style={{ fontFamily: 'ui-serif, Georgia, serif' }} className="text-2xl text-white sm:text-4xl">
            Find what you want.
          </h2>

          <div className="flex flex-col items-center gap-3">
            {BEATS.map((beat, i) => {
              const isFinal = i === BEATS.length - 1;
              const opacity = smoothstep(1 - Math.abs(activeIndex - i));
              return (
                <p
                  key={beat}
                  style={{
                    fontFamily: isFinal ? 'ui-serif, Georgia, serif' : undefined,
                    opacity: i <= activeIndex ? (isFinal ? opacity : Math.max(0.35, opacity)) : 0.15,
                  }}
                  className={
                    isFinal
                      ? 'glass-pill px-6 py-2 text-lg text-cyan-300'
                      : 'text-sm uppercase tracking-[0.2em] text-white/70'
                  }
                >
                  {beat}
                </p>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
