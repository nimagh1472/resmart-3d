import { GatewayHero } from '@/components/home-v2/GatewayHero';
import { RoleSelector } from '@/components/home-v2/RoleSelector';
import { ShopperStory } from '@/components/home-v2/ShopperStory';
import { MerchantStory } from '@/components/home-v2/MerchantStory';
import { DriverStory } from '@/components/home-v2/DriverStory';
import { OneTransaction } from '@/components/home-v2/OneTransaction';
import { LivingNetworkStory } from '@/components/home-v2/LivingNetworkStory';
import { Proof } from '@/components/home-v2/Proof';
import { InvestorStory } from '@/components/home-v2/InvestorStory';

/**
 * Isolated QA route for Homepage V2 — NOT linked from the live site's
 * navigation, matching this repo's existing isolation convention (see
 * /lab/spatial-v2, /lab/cinematic-hero). Not wired into production.
 */
export default function HomeV2Page() {
  return (
    <>
      <GatewayHero />
      <RoleSelector />
      <ShopperStory />
      <MerchantStory />
      <DriverStory />
      <OneTransaction />
      <LivingNetworkStory />
      <Proof />
      <InvestorStory />
    </>
  );
}
