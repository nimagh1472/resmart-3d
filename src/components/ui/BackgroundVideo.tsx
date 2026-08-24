'use client';

import { useState } from 'react';
import type { LeadRole } from '@/types';

const VIDEO_SRC = '/assets/cyber-dubai-loop.mp4';

interface BackgroundVideoProps {
  persona?: LeadRole;
}

/**
 * Full-viewport looping background video — replaces the old Three.js ambient
 * skyline canvas. Falls back to a static gradient if the source is missing
 * or fails to load. The vignette overlay's tint shifts when `persona` is
 * 'investor' (a warm gold cast, signalling the "Private Intelligence
 * Terminal" environment) vs. the default teal-tinted obsidian cast for
 * Shopper/Merchant/Driver — a lightweight stand-in for a full spatial
 * environment switch.
 */
export function BackgroundVideo({ persona }: BackgroundVideoProps) {
  const [hasError, setHasError] = useState(false);
  const isInvestor = persona === 'investor';

  return (
    <>
      {hasError ? (
        <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,245,212,0.08),transparent_60%),linear-gradient(to_bottom,#0B0F12,#05070a)]" />
      ) : (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          // iOS Safari ignores the camelCase `playsInline` prop on some
          // versions unless the lowercase webkit attribute is also present.
          webkit-playsinline="true"
          disablePictureInPicture
          className="fixed inset-0 z-0 h-full w-full object-cover pointer-events-none opacity-60"
          onError={() => setHasError(true)}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      )}
      <div
        className={
          isInvestor
            ? 'pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-black/70 via-transparent to-[#0A0D0F] transition-colors duration-700'
            : 'pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-black/60 via-transparent to-[#0A0D0F] transition-colors duration-700'
        }
      />
      {isInvestor && (
        <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_55%)] transition-opacity duration-700" />
      )}
    </>
  );
}
