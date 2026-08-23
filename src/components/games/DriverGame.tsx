'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import { Award, ChevronLeft, ChevronRight, Flag, RotateCcw, Trophy, Zap } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { getQualificationStatus, ROLE_BADGES } from '@/lib/leaderboard';
import {
  ROAD_LENGTH,
  TOTAL_NODE_COUNT,
  calculateDriverScore,
  driverGameTelemetry,
  requestLaneChange,
  resetDriverGameTelemetry,
  type DriverScoreBreakdown,
} from './driverGameState';

// nipplejs/R3F canvases touch `window` as a module-level side effect — load
// client-only, same reasoning as TouchControls.tsx / Experience.tsx.
const DriverGameScene = dynamic(() => import('@/components/games/DriverGameScene').then((mod) => mod.DriverGameScene), {
  ssr: false,
});

const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 800;

/**
 * Top-level orchestrator for the Driver-role lane-switching mini-game:
 * keyboard/on-screen lane controls, the 3-2-1 countdown, a live HUD polling
 * driverGameTelemetry (module-level, written every frame by
 * DriverGameScene — see driverGameState.ts for why this bypasses React
 * state), and the game-over/leaderboard-submission screen. Fully
 * self-contained — mounted by page.tsx in place of the main Experience
 * whenever the Driver persona is active.
 */
export function DriverGame() {
  const setRole = useRoleStore((state) => state.setRole);
  const email = useUserProfileStore((state) => state.email);
  const profileScore = useUserProfileStore((state) => state.score);
  const profileRank = useUserProfileStore((state) => state.rank);
  const addScore = useUserProfileStore((state) => state.addScore);

  const [runKey, setRunKey] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(COUNTDOWN_START);
  const [progressPercent, setProgressPercent] = useState(0);
  const [nodesCollected, setNodesCollected] = useState(0);
  const [collisionCount, setCollisionCount] = useState(0);
  const [speedState, setSpeedState] = useState<'boost' | 'slow' | 'normal'>('normal');
  const [result, setResult] = useState<DriverScoreBreakdown | null>(null);

  const hasFinishedRef = useRef(false);

  // Countdown → RUNNING, restartable via runKey (Play Again).
  useEffect(() => {
    resetDriverGameTelemetry();
    hasFinishedRef.current = false;
    setCountdown(COUNTDOWN_START);
    setProgressPercent(0);
    setNodesCollected(0);
    setCollisionCount(0);
    setSpeedState('normal');
    setResult(null);

    let remaining = COUNTDOWN_START;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setCountdown(null);
        driverGameTelemetry.phase = 'RUNNING';
        return;
      }
      setCountdown(remaining);
    }, COUNTDOWN_STEP_MS);

    return () => clearInterval(interval);
  }, [runKey]);

  // Poll the shared telemetry singleton at a throttled cadence — same
  // rationale as MiniMap.tsx polling vehicleTelemetry: a 60fps write side
  // (DriverGameScene's useFrame) should never itself drive React re-renders.
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressPercent(Math.min(100, Math.round((driverGameTelemetry.z / ROAD_LENGTH) * 100)));
      setNodesCollected(driverGameTelemetry.nodesCollected);
      setCollisionCount(driverGameTelemetry.collisionCount);
      setSpeedState(driverGameTelemetry.speedMultiplier > 1 ? 'boost' : driverGameTelemetry.speedMultiplier < 1 ? 'slow' : 'normal');

      if (driverGameTelemetry.phase === 'FINISHED' && !hasFinishedRef.current) {
        hasFinishedRef.current = true;
        const breakdown = calculateDriverScore(
          driverGameTelemetry.elapsedSeconds,
          driverGameTelemetry.nodesCollected,
          driverGameTelemetry.collisionCount,
        );
        setResult(breakdown);
        addScore(breakdown.total);
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 }, colors: ['#22d3ee', '#22c55e', '#facc15'] });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [runKey, addScore]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') requestLaneChange(-1);
      if (event.key === 'ArrowRight') requestLaneChange(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const qualification = result ? getQualificationStatus('driver', email) : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="pointer-events-auto absolute inset-0">
        <DriverGameScene key={runKey} />
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
        <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-cyan-400/25 bg-[rgba(10,16,26,0.8)] px-4 py-2 text-xs font-medium text-neutral-100 shadow-2xl shadow-cyan-500/10 backdrop-blur-[16px]">
          <Flag size={14} className="shrink-0 text-cyan-300" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-400 transition-[width]" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="shrink-0 text-neutral-300">{progressPercent}%</span>
          <span className="shrink-0 text-white/10">|</span>
          <span className="flex shrink-0 items-center gap-1 text-emerald-300">
            <Award size={12} /> {nodesCollected}/{TOTAL_NODE_COUNT}
          </span>
          <span className="shrink-0 text-white/10">|</span>
          <span className={clsx('shrink-0', collisionCount > 0 ? 'text-red-400' : 'text-neutral-400')}>{collisionCount} hits</span>
          {speedState !== 'normal' && (
            <span className={clsx('shrink-0 flex items-center gap-1', speedState === 'boost' ? 'text-cyan-300' : 'text-orange-400')}>
              <Zap size={12} /> {speedState === 'boost' ? 'BOOST' : 'SLOWED'}
            </span>
          )}
        </div>
      </div>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="text-8xl font-bold text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.6)]">{countdown}</span>
        </div>
      )}

      {/* On-screen lane controls */}
      {countdown === null && !result && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between p-6">
          <button
            onPointerDown={() => requestLaneChange(-1)}
            aria-label="Switch to left lane"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-300/70 bg-[rgba(10,16,26,0.85)] text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.5)] backdrop-blur-md active:scale-95 active:bg-cyan-500/30"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onPointerDown={() => requestLaneChange(1)}
            aria-label="Switch to right lane"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-300/70 bg-[rgba(10,16,26,0.85)] text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.5)] backdrop-blur-md active:scale-95 active:bg-cyan-500/30"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      )}

      {/* Game-over / success screen */}
      {result && qualification && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
            <div className="flex items-center gap-2 text-cyan-300">
              <Trophy size={18} />
              <span className="text-xs font-semibold uppercase tracking-widest">Point B Reached</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">Run Complete</h2>

            <ul className="mt-4 space-y-1.5 text-sm text-neutral-300">
              <li className="flex justify-between">
                <span>Time Bonus</span>
                <span className="font-medium text-white">+{result.timeScore}</span>
              </li>
              <li className="flex justify-between">
                <span>Nodes Collected ({nodesCollected}/{TOTAL_NODE_COUNT})</span>
                <span className="font-medium text-white">+{result.nodeScore}</span>
              </li>
              <li className="flex justify-between">
                <span>Collision Penalty ({collisionCount})</span>
                <span className="font-medium text-red-400">-{result.collisionPenalty}</span>
              </li>
              {result.zeroCollisionBonus > 0 && (
                <li className="flex justify-between text-emerald-300">
                  <span>Zero-Collision Bonus</span>
                  <span className="font-medium">+{result.zeroCollisionBonus}</span>
                </li>
              )}
              <li className="mt-2 flex justify-between border-t border-white/15 pt-2 text-base">
                <span className="font-semibold text-white">Run Score</span>
                <span className="font-semibold text-cyan-300">{result.total}</span>
              </li>
            </ul>

            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-neutral-400">
                <span>Total Score</span>
                <span>Leaderboard Rank</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-lg font-semibold text-white">{profileScore.toLocaleString()}</span>
                <span className="text-lg font-semibold text-white">#{profileRank || '—'}</span>
              </div>
            </div>

            <div
              className={clsx(
                'mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs',
                qualification.isQualified ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300',
              )}
            >
              <Award size={14} className="shrink-0" />
              {qualification.isQualified ? (
                <span>
                  You&apos;re Top 50! Qualified for <span className="font-semibold">Top 50 Driver — {ROLE_BADGES.driver}</span>.
                </span>
              ) : (
                <span>
                  <span className="font-semibold">{qualification.pointsToQualify} more points</span> to break into the Top 50 Driver
                  tier and unlock <span className="font-semibold">{ROLE_BADGES.driver}</span>.
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setRunKey((key) => key + 1)}
                className="flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <RotateCcw size={14} /> Play Again
              </button>
              <button
                onClick={() => setRole(null)}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
