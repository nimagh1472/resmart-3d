'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Activity, ChevronDown, ChevronUp, History, Sparkles, TicketPercent } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { VOUCHER_CONVERSION } from '@/lib/pitchData';
import type { StoryRoleKey } from '@/types';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatRelativeTime(timestamp: number, nowMs: number): string {
  const seconds = Math.round((timestamp - nowMs) / 1000);
  if (seconds > -5) return 'just now';
  if (seconds > -60) return relativeTimeFormatter.format(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  return relativeTimeFormatter.format(minutes, 'minute');
}

/**
 * Dark-glass "Market Engine" HUD: a collapsible side dashboard combining
 * three panels — live wallet/voucher progress, a scrolling transaction
 * ledger (populated by useRoleStore.pushTransaction from every earn/save
 * event), and a small AI Insights readout computed from current state. Only
 * shown once a role is picked and outside the CINEMATIC investor tour, so it
 * never competes with StoryHUD/CinematicBar for attention there.
 */
export function MarketEngineHUD() {
  const [isExpanded, setIsExpanded] = useState(true);
  const activeRole = useRoleStore((state) => state.activeRole);
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const customerWallet = useRoleStore((state) => state.customerWallet);
  const driverEarnings = useRoleStore((state) => state.driverEarnings);
  const transactions = useRoleStore((state) => state.transactions);
  const chapterIndex = useRoleStore((state) => (activeRole ? state.chapterIndex[activeRole as StoryRoleKey] : 0));
  const nearestZoneId = useRoleStore((state) => state.nearestZoneId);
  const agentOrderStage = useRoleStore((state) => state.agentOrderStage);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);

  if (!activeRole || presentationMode === 'CINEMATIC') return null;

  const balance = activeRole === 'AGENT' ? driverEarnings : customerWallet;
  const tierEarnings = balance % VOUCHER_CONVERSION.earningsPerVoucher;
  const progressPct = Math.min(100, (tierEarnings / VOUCHER_CONVERSION.earningsPerVoucher) * 100);
  const remainingToNextVoucher = Math.max(0, VOUCHER_CONVERSION.earningsPerVoucher - tierEarnings);

  const insight = getAiInsight({
    activeRole,
    chapterIndex: chapterIndex ?? 0,
    nearestZoneId,
    agentOrderStage,
    remainingToNextVoucher,
  });

  return (
    <div className="pointer-events-auto absolute right-4 top-24 z-30 w-64 overflow-hidden rounded-2xl border border-cyan-400/20 bg-neutral-950/75 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
      <button
        onClick={() => setIsExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">
          <Activity size={14} />
          Market Engine
        </span>
        {isExpanded ? (
          <ChevronUp size={14} className="text-neutral-400" />
        ) : (
          <ChevronDown size={14} className="text-neutral-400" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-3">
          {/* Wallet + voucher progress */}
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                {activeRole === 'AGENT' ? 'Driver earnings' : 'Wallet'}
              </span>
              <span className="text-lg font-semibold text-white">{currencyFormatter.format(balance)}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-400">
              <TicketPercent size={11} className="text-emerald-300" />
              {remainingToNextVoucher > 0
                ? `AED ${remainingToNextVoucher.toFixed(0)} to next AED ${VOUCHER_CONVERSION.voucherValuePerTier} voucher`
                : `Voucher tier unlocked`}
            </div>
          </div>

          {/* Transaction history */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              <History size={11} />
              Transaction History
            </div>
            {transactions.length === 0 ? (
              <p className="text-[11px] text-neutral-500">No activity yet — start driving to earn AED.</p>
            ) : (
              <ul className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                {transactions.map((transaction) => (
                  <li key={transaction.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-neutral-300">{transaction.label}</span>
                    <span className="flex shrink-0 items-center gap-1.5 font-medium text-emerald-300">
                      +{currencyFormatter.format(transaction.amount)}
                      <span className="text-[9px] font-normal text-neutral-500">
                        {formatRelativeTime(transaction.timestamp, nowMs)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* AI insights */}
          <div
            className={clsx(
              'flex items-start gap-2 rounded-xl border border-purple-400/20 bg-purple-500/10 p-2.5 text-[11px] leading-relaxed text-purple-100',
            )}
          >
            <Sparkles size={13} className="mt-0.5 shrink-0 text-purple-300" />
            {insight}
          </div>
        </div>
      )}
    </div>
  );
}

interface InsightInput {
  activeRole: 'CUSTOMER' | 'AGENT';
  chapterIndex: number;
  nearestZoneId: string | null;
  agentOrderStage: 'IDLE' | 'DISPATCHED' | 'VERIFIED';
  remainingToNextVoucher: number;
}

/** Small deterministic insight generator — no external calls, purely a readout of current state. */
function getAiInsight({ activeRole, chapterIndex, agentOrderStage, remainingToNextVoucher }: InsightInput): string {
  if (activeRole === 'AGENT') {
    if (agentOrderStage === 'IDLE') return 'Head to the ReSmart Hub to accept your next delivery order.';
    if (agentOrderStage === 'DISPATCHED') return 'Verify the gadget at the Merchant Test Station to earn your testing fee.';
    if (agentOrderStage === 'VERIFIED') return 'Race to the Express Drop-off before the 2-hour timer runs out.';
  } else if (chapterIndex === 0) {
    return 'Drive to the AI Vision Search Hub — ReSmart AI can already see nearby savings.';
  } else if (chapterIndex === 1) {
    return 'Cashback Gems on the Boulevard convert straight to wallet balance — grab all three.';
  }

  return remainingToNextVoucher > 0
    ? `You're on pace to unlock a real AED ${VOUCHER_CONVERSION.voucherValuePerTier} launch voucher soon.`
    : 'Voucher tier unlocked — keep earning to stack another one.';
}
