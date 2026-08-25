'use client';

import { useRef } from 'react';
import { SPATIAL_ASSETS } from '@/lib/spatialAssets';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';
import { useSpatialProgress } from '@/hooks/useSpatialProgress';

const BEATS = ['MATCHED', 'ROUTED', 'DELIVERED'];
const STEP = 1 / BEATS.length;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Homepage V2 — the shopper/merchant/driver threads converge into one
 * transaction. Same shape as ShopperStory.tsx (Phase 1); the delivery
 * asset already shows the merchant→driver handoff, so this beat ties
 * the three stories together on a single background rather than
 * cross-fading between them.
 */
export function OneTransaction() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress = useSpatialProgress(wrapperRef);
  const isDesktop = useIsDesktopViewport();
  const url = SPATIAL_ASSETS.delivery[isDesktop ? 'desktop' : 'mobile'];
  const activeIndex = Math.min(BEATS.length - 1, Math.floor(progress / STEP));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: '300vh' }}>
      <section className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden bg-[#050709]">
        <div className="absolute inset-[-4%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/80" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
          <h2 style={{ fontFamily: 'ui-serif, Georgia, serif' }} className="text-2xl text-white sm:text-4xl">
            One transaction. Three roles. One network.
          </h2>

          <div className="flex items-center gap-4 sm:gap-8">
            {BEATS.map((beat, i) => {
              const isFinal = i === BEATS.length - 1;
              const opacity = smoothstep(1 - Math.abs(activeIndex - i));
              return (
                <span key={beat} className="flex items-center gap-4 sm:gap-8">
                  <span
                    style={{ opacity: i <= activeIndex ? opacity : 0.15 }}
                    className={
                      isFinal
                        ? 'glass-pill px-5 py-2 text-sm font-medium uppercase tracking-[0.2em] text-cyan-300'
                        : 'text-sm font-medium uppercase tracking-[0.2em] text-white/70'
                    }
                  >
                    {beat}
                  </span>
                  {i < BEATS.length - 1 && <span className="h-px w-6 bg-white/20" aria-hidden />}
                </span>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
