import { useEffect, useState } from 'react';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getCountdownParts(targetTimestampMs: number, now: number): CountdownParts {
  const remainingMs = Math.max(0, targetTimestampMs - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Fixed Dubai launch target — every visitor sees the same countdown rather than a rolling "90 days from now". */
export const LAUNCH_TIMESTAMP = new Date('2026-11-21T00:00:00Z').getTime();

/**
 * Client-only countdown to `targetTimestampMs`, ticking every second.
 * Returns null until the first effect tick to avoid an SSR/CSR hydration
 * mismatch on Date.now() — callers should render a placeholder for the null
 * state on first paint.
 */
export function useCountdown(targetTimestampMs: number): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    setParts(getCountdownParts(targetTimestampMs, Date.now()));
    const interval = setInterval(() => setParts(getCountdownParts(targetTimestampMs, Date.now())), 1000);
    return () => clearInterval(interval);
  }, [targetTimestampMs]);

  return parts;
}

export function padCountdownValue(value: number): string {
  return value.toString().padStart(2, '0');
}
