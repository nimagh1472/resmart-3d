'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import { Award, ChevronLeft, ChevronRight, Flag, PackageCheck, PackageX, RotateCcw, Trophy } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { getQualificationStatus, ROLE_BADGES } from '@/lib/leaderboard';
import { GameNavBar } from '@/components/ui/GameNavBar';
import {
  ROAD_LENGTH,
  TARGET_PRODUCT_NAME,
  TOTAL_TARGET_COUNT,
  calculateCustomerScore,
  customerGameTelemetry,
  requestLaneChange,
  resetCustomerGameTelemetry,
} from './customerGameState';

// R3F canvases touch `window` as a module-level side effect — load
// client-only, same reasoning as DriverGame.tsx / Experience.tsx.
const CustomerGameScene = dynamic(() => import('@/components/games/CustomerGameScene').then((mod) => mod.CustomerGameScene), {
  ssr: false,
});

const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 800;

/**
 * Top-level orchestrator for the Customer-role pick-and-avoid mini-game:
 * keyboard/on-screen lane controls, the 3-2-1 countdown (which also
 * announces the target product), a live HUD polling customerGameTelemetry
 * (module-level, written every frame by CustomerGameScene — see
 * customerGameState.ts), and the finish/game-over/leaderboard-submission
 * screen. Picking any non-target item is instant Game Over, unlike
 * DriverGame's collision penalty — so this shares DriverGame's plumbing
 * shape but not its scoring/failure model.
 */
export function CustomerGame() {
  const setRole = useRoleStore((state) => state.setRole);
  const email = useUserProfileStore((state) => state.email);
  const profileScore = useUserProfileStore((state) => state.score);
  const profileRank = useUserProfileStore((state) => state.rank);
  const addScore = useUserProfileStore((state) => state.addScore);

  const [runKey, setRunKey] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(COUNTDOWN_START);
  const [progressPercent, setProgressPercent] = useState(0);
  const [correctPicks, setCorrectPicks] = useState(0);
  const [outcome, setOutcome] = useState<'FINISHED' | 'GAME_OVER' | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  const hasEndedRef = useRef(false);

  // Countdown → RUNNING, restartable via runKey (Play Again).
  useEffect(() => {
    resetCustomerGameTelemetry();
    hasEndedRef.current = false;
    setCountdown(COUNTDOWN_START);
    setProgressPercent(0);
    setCorrectPicks(0);
    setOutcome(null);
    setFinalScore(0);

    let remaining = COUNTDOWN_START;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setCountdown(null);
        customerGameTelemetry.phase = 'RUNNING';
        return;
      }
      setCountdown(remaining);
    }, COUNTDOWN_STEP_MS);

    return () => clearInterval(interval);
  }, [runKey]);

  // Poll the shared telemetry singleton at a throttled cadence — same
  // rationale as DriverGame.tsx / MiniMap.tsx polling their own telemetry
  // singletons: a 60fps write side should never itself drive React re-renders.
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressPercent(Math.min(100, Math.round((customerGameTelemetry.z / ROAD_LENGTH) * 100)));
      setCorrectPicks(customerGameTelemetry.correctPicks);

      const phase = customerGameTelemetry.phase;
      if ((phase === 'FINISHED' || phase === 'GAME_OVER') && !hasEndedRef.current) {
        hasEndedRef.current = true;
        const score = calculateCustomerScore(customerGameTelemetry.correctPicks);
        setFinalScore(score);
        setOutcome(phase);
        addScore(score);
        if (phase === 'FINISHED') {
          confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 }, colors: ['#a855f7', '#22c55e', '#facc15'] });
        }
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

  const qualification = outcome ? getQualificationStatus('customer', email) : null;
  const isSuccess = outcome === 'FINISHED';

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="pointer-events-auto absolute inset-0">
        <CustomerGameScene key={runKey} />
      </div>

      <GameNavBar />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
        <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-purple-400/25 bg-[rgba(23,15,34,0.8)] px-4 py-2 text-xs font-medium text-neutral-100 shadow-2xl shadow-purple-500/10 backdrop-blur-[16px]">
          <Flag size={14} className="shrink-0 text-purple-300" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-purple-400 transition-[width]" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="shrink-0 text-neutral-300">{progressPercent}%</span>
          <span className="shrink-0 text-white/10">|</span>
          <span className="flex shrink-0 items-center gap-1 text-emerald-300">
            <PackageCheck size={12} /> {correctPicks}/{TOTAL_TARGET_COUNT}
          </span>
        </div>
        <div className="pointer-events-none rounded-full border border-purple-400/25 bg-[rgba(23,15,34,0.8)] px-3 py-1 text-[11px] text-neutral-300 backdrop-blur-[16px]">
          Target: <span className="font-semibold text-emerald-300">{TARGET_PRODUCT_NAME}</span>
        </div>
      </div>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
          <p className="text-sm uppercase tracking-widest text-purple-300">Collect the</p>
          <p className="text-2xl font-semibold text-white">{TARGET_PRODUCT_NAME}</p>
          <span className="mt-2 text-8xl font-bold text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]">{countdown}</span>
        </div>
      )}

      {/* On-screen lane controls */}
      {countdown === null && !outcome && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between p-6">
          <button
            onPointerDown={() => requestLaneChange(-1)}
            aria-label="Switch to left lane"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-purple-300/70 bg-[rgba(23,15,34,0.85)] text-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.5)] backdrop-blur-md active:scale-95 active:bg-purple-500/30"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onPointerDown={() => requestLaneChange(1)}
            aria-label="Switch to right lane"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-purple-300/70 bg-[rgba(23,15,34,0.85)] text-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.5)] backdrop-blur-md active:scale-95 active:bg-purple-500/30"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      )}

      {/* Finish / Game Over screen */}
      {outcome && qualification && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-purple-500/10 backdrop-blur-2xl">
            <div className={clsx('flex items-center gap-2', isSuccess ? 'text-purple-300' : 'text-red-400')}>
              {isSuccess ? <Trophy size={18} /> : <PackageX size={18} />}
              <span className="text-xs font-semibold uppercase tracking-widest">
                {isSuccess ? 'Point B Reached' : 'Wrong Item Picked'}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">{isSuccess ? 'Delivery Complete' : 'Game Over'}</h2>
            <p className="mt-1 text-sm text-neutral-400">
              {isSuccess
                ? `Every ${TARGET_PRODUCT_NAME} picked up, no damaged items.`
                : `That wasn't a ${TARGET_PRODUCT_NAME} — the run ends the moment a wrong item is picked up.`}
            </p>

            <ul className="mt-4 space-y-1.5 text-sm text-neutral-300">
              <li className="flex justify-between">
                <span>Valid Items Picked</span>
                <span className="font-medium text-white">
                  {correctPicks}/{TOTAL_TARGET_COUNT}
                </span>
              </li>
              <li className="mt-2 flex justify-between border-t border-white/15 pt-2 text-base">
                <span className="font-semibold text-white">Run Score</span>
                <span className="font-semibold text-purple-300">{finalScore}</span>
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
                  You&apos;re Top 50! Qualified for <span className="font-semibold">Top 50 Customer — {ROLE_BADGES.customer}</span>.
                </span>
              ) : (
                <span>
                  <span className="font-semibold">{qualification.pointsToQualify} more points</span> to break into the Top 50
                  Customer tier and unlock <span className="font-semibold">{ROLE_BADGES.customer}</span>.
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
                className="rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
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
