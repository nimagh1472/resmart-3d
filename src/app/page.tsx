'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { StickyHeader } from '@/components/ui/StickyHeader';
import { GatewayHero } from '@/components/home-v2/GatewayHero';
import { RoleSelector } from '@/components/home-v2/RoleSelector';
import { ShopperStory } from '@/components/home-v2/ShopperStory';
import { MerchantStory } from '@/components/home-v2/MerchantStory';
import { DriverStory } from '@/components/home-v2/DriverStory';
import { OneTransaction } from '@/components/home-v2/OneTransaction';
import { LivingNetworkStory } from '@/components/home-v2/LivingNetworkStory';
import { Proof } from '@/components/home-v2/Proof';
import { InvestorStory } from '@/components/home-v2/InvestorStory';
import { SceneCommerce } from '@/components/ui/scenes/SceneCommerce';
import { SceneLogistics } from '@/components/ui/scenes/SceneLogistics';
import { SceneNetwork } from '@/components/ui/scenes/SceneNetwork';
import { InvestorAccessModal } from '@/components/ui/InvestorAccessModal';
import { Footer } from '@/components/ui/Footer';
import { DEFAULT_DISTRICT_ID } from '@/lib/pitchData';
import { useIntentPersona } from '@/hooks/useIntentPersona';
import type { DistrictId, LeadRole } from '@/types';

// Client-only + code-split: the intro's assets/logic never enter the
// initial bundle, and (via ssr:false) never render on the server — first
// paint for a returning/intent-routed visitor is the real site, with no
// server-rendered flash of the intro to hydrate away.
const SpatialStage = dynamic(
  () => import('@/components/spatial/SpatialStage').then((mod) => mod.SpatialStage),
  { ssr: false }
);

/** Same anchor-scroll convention as RegistrationHubs.tsx / the old Hero.tsx. */
function scrollToLeadCapture(role: Exclude<LeadRole, 'investor'>) {
  const anchorId = role === 'driver' ? 'lead-capture-driver' : 'lead-capture';
  document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Homepage V2: Spatial V2's scroll-driven intro (src/components/spatial)
 * hands off seamlessly into the Homepage V2 narrative (Gateway -> Role
 * Selector -> Shopper/Merchant/Driver stories -> One Transaction -> Living
 * Network -> Proof -> Investor, all in src/components/home-v2), which in
 * turn feeds the still-functional lead-capture/district/investor pieces
 * of the original build: SceneCommerce/SceneLogistics (the real
 * LeadCaptureCard forms), SceneNetwork (the real DistrictSelector), and
 * InvestorAccessModal. The old Hero/SceneProblem/SceneAiLayer/SceneInvestor
 * narrative scenes are retired (superseded visually by Homepage V2) but
 * every underlying flow they exposed — persona selection, lead capture,
 * investor access, the countdown (still in StickyHeader), referral/query
 * routing (useIntentPersona) — is preserved.
 */
export default function Home() {
  const initialPersona = useIntentPersona();
  const [persona, setPersona] = useState<LeadRole>(initialPersona);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>(DEFAULT_DISTRICT_ID);
  const [isInvestorAccessOpen, setIsInvestorAccessOpen] = useState(false);
  const [isInvestorSceneInView] = useState(false);
  const openInvestorAccess = () => setIsInvestorAccessOpen(true);
  const homeContentRef = useRef<HTMLDivElement>(null);

  // Spatial V2 is normal in-flow page content (a tall sticky-stage scroll
  // sequence), not a fixed overlay — "skip" and "choose a persona" don't
  // unmount anything, they just scroll straight past it into this ref'd
  // section, which is what makes the handoff seamless instead of a cut.
  const scrollPastIntro = () => homeContentRef.current?.scrollIntoView({ behavior: 'smooth' });
  const handlePersonaFromIntro = (role: LeadRole) => {
    setPersona(role);
    if (role === 'investor') setIsInvestorAccessOpen(true);
  };

  // Homepage V2's Gateway/Role Selector sections reuse this same real
  // flow — set persona, then either open the investor modal or scroll to
  // the matching LeadCaptureCard anchor.
  const handleSelectPersona = (role: LeadRole) => {
    setPersona(role);
    if (role === 'investor') openInvestorAccess();
    else scrollToLeadCapture(role);
  };

  return (
    <>
      <SpatialStage onSkip={scrollPastIntro} onSelectPersona={handlePersonaFromIntro} />

      <div ref={homeContentRef}>
        <BackgroundVideo persona={persona} investorSceneInView={isInvestorSceneInView} />

        <main className="relative z-20 min-h-screen w-full overflow-x-hidden">
          <div className="flex flex-col items-center">
            <StickyHeader onOpenInvestorAccess={openInvestorAccess} />

            <GatewayHero onSelectPersona={handleSelectPersona} />
            <RoleSelector onSelectPersona={handleSelectPersona} />
            <ShopperStory />
            <MerchantStory />
            <DriverStory />
            <OneTransaction />
            <LivingNetworkStory />
            <Proof />
            <InvestorStory onOpenInvestorAccess={openInvestorAccess} />

            <SceneCommerce persona={persona} onSelectPersona={setPersona} selectedDistrict={selectedDistrict} />
            <SceneLogistics persona={persona} onSelectPersona={setPersona} selectedDistrict={selectedDistrict} />
            <SceneNetwork selectedDistrict={selectedDistrict} onSelectDistrict={setSelectedDistrict} />

            <Footer />
          </div>

          <InvestorAccessModal isOpen={isInvestorAccessOpen} onClose={() => setIsInvestorAccessOpen(false)} />
        </main>
      </div>
    </>
  );
}
