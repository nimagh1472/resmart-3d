'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Building2, Gauge } from 'lucide-react';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { StickyHeader } from '@/components/ui/StickyHeader';
import { LeadCaptureCard } from '@/components/ui/LeadCaptureCard';
import { InvestorAccessModal } from '@/components/ui/InvestorAccessModal';
import { Footer } from '@/components/ui/Footer';
import { DISTRICTS, DEFAULT_DISTRICT_ID, MERCHANT_NETWORK_TARGET } from '@/lib/pitchData';
import { useIntentPersona } from '@/hooks/useIntentPersona';
import type { LeadRole } from '@/types';

// Client-only + code-split: the intro's assets/logic never enter the
// initial bundle, and (via ssr:false) never render on the server — first
// paint for a returning/intent-routed visitor is the real site, with no
// server-rendered flash of the intro to hydrate away.
const SpatialStage = dynamic(
  () => import('@/components/spatial/SpatialStage').then((mod) => mod.SpatialStage),
  { ssr: false }
);

const LAUNCH_DISTRICT_GMV_AED = (DISTRICTS.find((d) => d.id === DEFAULT_DISTRICT_ID) ?? DISTRICTS[0]).regionalGmvAed;

/**
 * Homepage — Spatial V2's single continuous 12-act scroll stage
 * (src/components/spatial) *is* the homepage. It ends on its own persona
 * gateway (Act 12: Shop / Sell / Drive / Invest material cards), which
 * hands off directly into this one conversion section below: the launch
 * metrics, the real LeadCaptureCard funnel (Shopper/Merchant/Driver forms),
 * and InvestorAccessModal for Invest. No intermediate narrative sections —
 * the intro is the pitch, this is just where it converts.
 */
export default function Home() {
  const initialPersona = useIntentPersona();
  const [persona, setPersona] = useState<LeadRole>(initialPersona);
  const [isInvestorAccessOpen, setIsInvestorAccessOpen] = useState(false);
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

  return (
    <>
      <SpatialStage onSkip={scrollPastIntro} onSelectPersona={handlePersonaFromIntro} />

      <div ref={homeContentRef}>
        <BackgroundVideo persona={persona} />

        <main className="relative z-20 min-h-screen w-full overflow-x-hidden">
          <div className="flex flex-col items-center">
            <StickyHeader onOpenInvestorAccess={openInvestorAccess} />

            <section className="flex w-full flex-col items-center px-4 pt-16 sm:pt-24">
              <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">Join the Network</h2>
              <p className="mt-2 max-w-md text-center text-sm text-neutral-400">
                One intelligent commerce &amp; logistics layer for Dubai — pick your role below.
              </p>

              <div className="glass-panel mx-auto mt-6 flex w-fit flex-wrap items-center justify-center gap-6 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Gauge size={20} className="text-cyan-300" />
                  <div>
                    <div className="font-mono text-xl font-semibold text-white">
                      AED {(LAUNCH_DISTRICT_GMV_AED / 1_000_000).toLocaleString()}M
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Downtown Dubai GMV Model</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-cyan-300" />
                  <div>
                    <div className="font-mono text-xl font-semibold text-white">{MERCHANT_NETWORK_TARGET}</div>
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Merchant Network Target</div>
                  </div>
                </div>
              </div>
            </section>

            <LeadCaptureCard persona={persona} onSelectPersona={setPersona} selectedDistrict={DEFAULT_DISTRICT_ID} />

            <Footer />
          </div>

          <InvestorAccessModal isOpen={isInvestorAccessOpen} onClose={() => setIsInvestorAccessOpen(false)} />
        </main>
      </div>
    </>
  );
}
