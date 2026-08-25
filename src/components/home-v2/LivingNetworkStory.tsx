'use client';

import { SPATIAL_ASSETS } from '@/lib/spatialAssets';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';

/**
 * Homepage V2 — pulls back from the single transaction into the
 * city-wide network. A static (non-scroll-driven) viewport, unlike the
 * story sections above — the pull-back is Spatial V2's job upstream;
 * here it's one settled idea, not a second animated sequence.
 */
export function LivingNetworkStory() {
  const isDesktop = useIsDesktopViewport();
  const url = SPATIAL_ASSETS.network[isDesktop ? 'desktop' : 'mobile'];

  return (
    <section className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#050709]">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/80" />

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        <h2 style={{ fontFamily: 'ui-serif, Georgia, serif' }} className="text-2xl text-white sm:text-4xl">
          One city. One living network.
        </h2>
        <p className="glass-pill px-5 py-2 text-xs uppercase tracking-[0.25em] text-cyan-300">
          Shoppers · Merchants · Drivers
        </p>
      </div>
    </section>
  );
}
