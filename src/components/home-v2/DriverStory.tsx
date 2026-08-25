'use client';

import { useRef } from 'react';
import { SPATIAL_ASSETS } from '@/lib/spatialAssets';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';
import { useSpatialProgress } from '@/hooks/useSpatialProgress';

const BEATS = ['Order ready', 'Optimized Dubai route', 'Moving', 'Delivered.'];
const STEP = 1 / BEATS.length;

// Chase carries "order ready / route / moving"; Delivery takes over for the
// "Delivered." payoff — a continuous crossfade, not a hard cut, echoing
// Spatial V2's shared-asset continuity.
const HANDOFF_START = 0.6;
const HANDOFF_END = 0.85;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Homepage V2 — Driver story: 05-chase crossfades into 06-delivery. */
export function DriverStory() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress = useSpatialProgress(wrapperRef);
  const isDesktop = useIsDesktopViewport();
  const chaseUrl = SPATIAL_ASSETS.chase[isDesktop ? 'desktop' : 'mobile'];
  const deliveryUrl = SPATIAL_ASSETS.delivery[isDesktop ? 'desktop' : 'mobile'];
  const activeIndex = Math.min(BEATS.length - 1, Math.floor(progress / STEP));
  const deliveryOpacity = smoothstep((progress - HANDOFF_START) / (HANDOFF_END - HANDOFF_START));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: '350vh' }}>
      <section className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden bg-[#050709]">
        <div className="absolute inset-[-4%]" style={{ opacity: 1 - deliveryOpacity }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={chaseUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-[-4%]" style={{ opacity: deliveryOpacity }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={deliveryUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/80" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
          <h2 style={{ fontFamily: 'ui-serif, Georgia, serif' }} className="text-2xl text-white sm:text-4xl">
            Zero-commission, AI-dispatched.
          </h2>

          <div className="flex flex-col items-center gap-3">
            {BEATS.map((beat, i) => {
              const isFinal = i === BEATS.length - 1;
              const opacity = smoothstep(1 - Math.abs(activeIndex - i));
              return (
                <p
                  key={beat}
                  style={{ opacity: i <= activeIndex ? (isFinal ? opacity : Math.max(0.35, opacity)) : 0.15 }}
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
