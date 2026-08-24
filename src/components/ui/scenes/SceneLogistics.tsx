'use client';

import { Gauge, Route } from 'lucide-react';
import { SceneHeading } from '@/components/ui/SceneHeading';
import { DriverHubCard } from '@/components/ui/RegistrationHubs';
import { LeadCaptureCard } from '@/components/ui/LeadCaptureCard';
import { DISTRICTS, DEFAULT_DISTRICT_ID } from '@/lib/pitchData';
import type { DistrictId, LeadRole } from '@/types';

const DEFAULT_DISTRICT_EFFICIENCY = (DISTRICTS.find((d) => d.id === DEFAULT_DISTRICT_ID) ?? DISTRICTS[0]).aiRouteEfficiencyPct;

interface SceneLogisticsProps {
  persona: LeadRole;
  onSelectPersona: (role: LeadRole) => void;
  selectedDistrict: DistrictId;
}

/**
 * Scene 05 — LOGISTICS. "Fulfill Intelligently" + the AI route-efficiency
 * stat (Downtown Dubai's default figure — the same interactive figure lives
 * in Scene 06's DistrictSelector) + Driver's registration hub card and its
 * own dedicated LeadCaptureCard instance (visibleRoles=['driver']).
 */
export function SceneLogistics({ persona, onSelectPersona, selectedDistrict }: SceneLogisticsProps) {
  return (
    <section className="flex w-full flex-col items-center px-4 pt-16 sm:pt-24">
      <SceneHeading index={5} name="Logistics" headline="Fulfill Intelligently" />

      <div className="glass-panel mx-auto mt-6 flex w-full max-w-xl items-center justify-center gap-6 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Gauge size={20} className="text-cyan-300" />
          <div>
            <div className="font-mono text-xl font-semibold text-white">{DEFAULT_DISTRICT_EFFICIENCY}%</div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">AI Route Efficiency</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Route size={20} className="text-cyan-300" />
          <div className="max-w-[10rem] text-xs text-neutral-400">Autonomous, zero-commission route optimization for every driver.</div>
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-2xl px-4">
        <DriverHubCard onSelectPersona={onSelectPersona} />
      </div>

      <LeadCaptureCard
        persona={persona}
        onSelectPersona={onSelectPersona}
        selectedDistrict={selectedDistrict}
        visibleRoles={['driver']}
      />
    </section>
  );
}
