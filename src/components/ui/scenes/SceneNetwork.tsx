'use client';

import { Building2 } from 'lucide-react';
import { SceneHeading } from '@/components/ui/SceneHeading';
import { GrowthFlywheel } from '@/components/ui/GrowthFlywheel';
import { DistrictSelector } from '@/components/ui/DistrictSelector';
import { MERCHANT_NETWORK_TARGET } from '@/lib/pitchData';
import type { DistrictId } from '@/types';

interface SceneNetworkProps {
  selectedDistrict: DistrictId;
  onSelectDistrict: (id: DistrictId) => void;
}

/**
 * Scene 06 — NETWORK EFFECT. GrowthFlywheel's compounding-loop visual, the
 * static network-wide merchant target (distinct from DistrictSelector's
 * live per-district figures below it), and the interactive Active
 * Districts breakdown (Downtown/Business Bay/SZR/DIFC + Addressable GMV).
 */
export function SceneNetwork({ selectedDistrict, onSelectDistrict }: SceneNetworkProps) {
  return (
    <section className="flex w-full flex-col items-center px-4 pt-16 sm:pt-24">
      <SceneHeading index={6} name="Network Effect" headline="One intelligent commerce network." />

      <div className="glass-panel mx-auto mt-6 flex w-fit items-center gap-2 rounded-full px-4 py-2">
        <Building2 size={15} className="text-cyan-300" />
        <span className="font-mono text-sm font-semibold text-white">{MERCHANT_NETWORK_TARGET}</span>
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">Merchant Network Target</span>
      </div>

      <GrowthFlywheel />
      <DistrictSelector selectedDistrict={selectedDistrict} onSelectDistrict={onSelectDistrict} />
    </section>
  );
}
