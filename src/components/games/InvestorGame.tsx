'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Award, Gauge, LineChart, Play, RotateCcw, Share2, Truck, Users } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { getQualificationStatus, ROLE_BADGES } from '@/lib/leaderboard';
import { QuickTutorialOverlay } from '@/components/ui/QuickTutorialOverlay';
import {
  DEFAULT_INVESTOR_INPUTS,
  INPUT_RANGES,
  SIMULATION_DURATION_MS,
  calculateInvestorResult,
  investorSimTelemetry,
  resetInvestorSimTelemetry,
  type InvestorInputs,
  type InvestorResult,
} from './investorGameState';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('en-US');

interface SliderConfig {
  key: keyof InvestorInputs;
  label: string;
  icon: typeof Truck;
  format: (value: number) => string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'dailyTargetOrders', label: 'Daily Target Orders', icon: LineChart, format: (v) => `${numberFormatter.format(v)}/day` },
  { key: 'staffOpsCostAed', label: 'Staff / Ops Cost', icon: Users, format: (v) => `${currencyFormatter.format(v)}/day` },
  { key: 'fleetSize', label: 'Fleet Size (AI Drivers)', icon: Truck, format: (v) => `${numberFormatter.format(v)} drivers` },
  { key: 'efficiencyPct', label: 'Fuel & Route Efficiency', icon: Gauge, format: (v) => `${v}%` },
];

/**
 * Investor strategy dashboard: an overlay panel on top of the main
 * Experience's 3D Dubai scene (unlike Driver/Customer, which fully replace
 * it — see InvestorSimulationScene.tsx, mounted inside Experience.tsx's
 * Canvas, for the fleet-orbit animation and holographic ROI chart this
 * dashboard drives via investorGameState.ts's shared telemetry). Only
 * renders during the CINEMATIC investor tour.
 */
export function InvestorGame() {
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const email = useUserProfileStore((state) => state.email);
  const profileScore = useUserProfileStore((state) => state.score);
  const profileRank = useUserProfileStore((state) => state.rank);
  const addScore = useUserProfileStore((state) => state.addScore);
  const openShareCard = useUserProfileStore((state) => state.openShareCard);

  const [inputs, setInputs] = useState<InvestorInputs>(DEFAULT_INVESTOR_INPUTS);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [result, setResult] = useState<InvestorResult | null>(null);

  const hasScoredRef = useRef(false);

  useEffect(() => {
    return () => resetInvestorSimTelemetry();
  }, []);

  if (presentationMode !== 'CINEMATIC') return null;

  const runSimulation = () => {
    if (investorSimTelemetry.phase === 'RUNNING') return;
    resetInvestorSimTelemetry();
    investorSimTelemetry.phase = 'RUNNING';
    investorSimTelemetry.fleetSize = inputs.fleetSize;
    investorSimTelemetry.efficiencyPct = inputs.efficiencyPct;
    hasScoredRef.current = false;
    setResult(null);
    setIsRunning(true);

    const startedAt = performance.now();
    const interval = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      investorSimTelemetry.progress = Math.min(1, elapsed / SIMULATION_DURATION_MS);
      setSecondsRemaining(Math.max(0, Math.ceil((SIMULATION_DURATION_MS - elapsed) / 1000)));

      if (elapsed >= SIMULATION_DURATION_MS && !hasScoredRef.current) {
        hasScoredRef.current = true;
        clearInterval(interval);
        const computed = calculateInvestorResult(inputs);
        investorSimTelemetry.result = computed;
        investorSimTelemetry.phase = 'COMPLETE';
        setResult(computed);
        setIsRunning(false);
        addScore(computed.leaderboardScore);
      }
    }, 100);
  };

  const runAgain = () => {
    resetInvestorSimTelemetry();
    setResult(null);
  };

  const qualification = result ? getQualificationStatus('investor', email) : null;

  return (
    <>
      <QuickTutorialOverlay
        triggerKey="investor"
        message="Adjust the sliders, then tap Run Simulation to launch your 10-second logistics test."
      />
      {/* Below sm, a fixed 320px left sidebar would cover ~85% of a 375px-class
          viewport and hide the 3D tour entirely — so it docks as a capped-height
          bottom sheet on mobile instead, and only becomes the original full-height
          left sidebar at sm+ (640px), where 320px is a modest fraction of the width.
          Capped well under full viewport height on both breakpoints so the 3D Dubai
          scene stays visible above/beside it rather than being blocked. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] flex justify-center sm:inset-x-auto sm:inset-y-0 sm:left-4 sm:items-center sm:justify-start">
        <div className="animate-modal-in pointer-events-auto max-h-[42vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/15 bg-white/10 p-5 pb-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl sm:max-h-[68vh] sm:w-80 sm:rounded-3xl sm:border">
          <div className="flex items-center gap-2 text-cyan-300">
            <LineChart size={16} />
            <span className="text-xs font-semibold uppercase tracking-widest">Strategy Dashboard</span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Balance fleet, cost, and efficiency, then run a 10-second logistics simulation over Downtown Dubai.
          </p>

          <div className="mt-4 space-y-4">
            {SLIDERS.map(({ key, label, icon: Icon, format }) => {
              const range = INPUT_RANGES[key];
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <Icon size={12} className="text-cyan-300" /> {label}
                    </span>
                    <span className="font-semibold text-white">{format(inputs[key])}</span>
                  </div>
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={inputs[key]}
                    disabled={isRunning}
                    onChange={(event) => setInputs((current) => ({ ...current, [key]: Number(event.target.value) }))}
                    className="min-h-[44px] w-full accent-cyan-400 disabled:opacity-50"
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            <Play size={14} />
            {isRunning ? `Simulating… ${secondsRemaining}s` : 'Run Simulation'}
          </button>

          {result && qualification && (
            <div className="mt-4 space-y-3 border-t border-white/15 pt-4">
              <ul className="space-y-1.5 text-sm text-neutral-300">
                <li className="flex justify-between">
                  <span>Orders Fulfilled</span>
                  <span className="font-medium text-white">{numberFormatter.format(result.actualOrders)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Net Profit Margin</span>
                  <span className={clsx('font-medium', result.netProfitMarginPct >= 0 ? 'text-emerald-300' : 'text-red-400')}>
                    {result.netProfitMarginPct.toFixed(1)}%
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>ROI</span>
                  <span className={clsx('font-medium', result.roiPct >= 0 ? 'text-emerald-300' : 'text-red-400')}>
                    {result.roiPct.toFixed(1)}%
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Operational Efficiency</span>
                  <span className="font-medium text-cyan-300">{result.operationalEfficiencyScore}/100</span>
                </li>
                <li className="mt-1 flex justify-between border-t border-white/15 pt-2 text-base">
                  <span className="font-semibold text-white">Simulation Score</span>
                  <span className="font-semibold text-cyan-300">{result.leaderboardScore}</span>
                </li>
              </ul>

              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
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
                  'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed',
                  qualification.isQualified ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300',
                )}
              >
                <Award size={14} className="mt-0.5 shrink-0" />
                {qualification.isQualified ? (
                  <span>
                    Top 50! Qualified for <span className="font-semibold">Top 50 Investor — {ROLE_BADGES.investor}</span>.
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold">{qualification.pointsToQualify} more points</span> to reach the Top 50 Investor
                    tier and unlock <span className="font-semibold">{ROLE_BADGES.investor}</span>.
                  </span>
                )}
              </div>

              <button
                onClick={() => openShareCard('investor')}
                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
              >
                <Share2 size={14} /> Share Rank
              </button>

              <button
                onClick={runAgain}
                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <RotateCcw size={14} /> Adjust & Run Again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
