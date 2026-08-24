'use client';

import { useState } from 'react';

const VIDEO_SRC = '/assets/cyber-dubai-loop.mp4';

/**
 * Full-viewport looping background video — replaces the old Three.js ambient
 * skyline canvas. Falls back to a static gradient if the source is missing
 * or fails to load.
 */
export function BackgroundVideo() {
  const [hasError, setHasError] = useState(false);

  return (
    <>
      {hasError ? (
        <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,229,255,0.08),transparent_60%),linear-gradient(to_bottom,#0B0F12,#05070a)]" />
      ) : (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 z-0 h-full w-full object-cover pointer-events-none opacity-40"
          src={VIDEO_SRC}
          onError={() => setHasError(true)}
        />
      )}
      <div className="pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-black/60 via-transparent to-[#0A0D0F]" />
    </>
  );
}
