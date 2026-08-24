'use client';

import { SceneHeading } from '@/components/ui/SceneHeading';
import { NetworkFlowStrip } from '@/components/ui/NetworkFlowStrip';
import { HowItWorksCards } from '@/components/ui/HowItWorksCards';
import { ShopperMerchantHubCard } from '@/components/ui/RegistrationHubs';
import { LeadCaptureCard } from '@/components/ui/LeadCaptureCard';
import type { DistrictId, LeadRole } from '@/types';

interface SceneCommerceProps {
  persona: LeadRole;
  onSelectPersona: (role: LeadRole) => void;
  selectedDistrict: DistrictId;
}

/**
 * Scene 04 — COMMERCE. NetworkFlowStrip's SEARCH -> MATCH -> TRANSACT ->
 * FULFILL pipeline, HowItWorksCards' mechanics recap, and the
 * Shopper/Merchant registration hub card + form (LeadCaptureCard filtered
 * to those 2 tabs — Driver's form is Scene 05's own instance instead).
 */
export function SceneCommerce({ persona, onSelectPersona, selectedDistrict }: SceneCommerceProps) {
  return (
    <section className="flex w-full flex-col items-center px-4 pt-16 sm:pt-24">
      <SceneHeading index={4} name="Commerce" />
      <NetworkFlowStrip />
      <HowItWorksCards />
      <div className="mx-auto w-full max-w-2xl px-4">
        <ShopperMerchantHubCard onSelectPersona={onSelectPersona} />
      </div>
      <LeadCaptureCard
        persona={persona}
        onSelectPersona={onSelectPersona}
        selectedDistrict={selectedDistrict}
        visibleRoles={['shopper', 'merchant']}
      />
    </section>
  );
}
