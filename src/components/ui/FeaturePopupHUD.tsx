'use client';

import { Sparkles, Zap } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';

/**
 * Energetic HUD pop-up shown on station completion — doubles as the
 * business-feature marketing beat (AI Comparison, Cashback Rewards, 2-Hour
 * Delivery Guarantee, Agent Earning Model). The first time a given feature
 * fires it renders a big animated card; useRoleStore.pushFeaturePopup
 * downgrades repeat completions to a compact reward pill so the endless
 * Agent/cashback loops stay energetic without becoming spammy. Only the
 * front of the queue is shown; each pop-up dismisses itself via a timeout
 * set when it was pushed (see useRoleStore.pushFeaturePopup).
 */
export function FeaturePopupHUD() {
  const popup = useRoleStore((state) => state.featurePopupQueue[0]);

  if (!popup) return null;

  if (popup.kind === 'REWARD') {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-20 z-50 flex justify-center">
        <div
          key={popup.id}
          className="animate-feature-pop flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-green-500/30"
        >
          <Zap size={14} />
          {popup.title}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-50 flex justify-center">
      <div
        key={popup.id}
        className="animate-feature-pop flex max-w-md items-start gap-3 rounded-2xl border border-purple-400/40 bg-gradient-to-br from-neutral-900 to-asphalt px-5 py-4 text-left shadow-2xl shadow-purple-500/30"
      >
        <div className="mt-0.5 rounded-full bg-purple-500/20 p-2 text-purple-300">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">{popup.title}</p>
          {popup.description && <p className="mt-1 text-sm text-neutral-200">{popup.description}</p>}
        </div>
      </div>
    </div>
  );
}
