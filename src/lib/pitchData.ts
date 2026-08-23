import type { PitchMetric, WorldBounds, ZoneDefinition } from '@/types';

/**
 * Single source of truth for every pitch figure, boundary, and zone used across
 * the 3D experience and UI. Components must import from here rather than
 * hard-coding financial or market figures inline.
 */

export const WORLD_BOUNDS: WorldBounds = {
  minX: -100,
  maxX: 100,
  minZ: -100,
  maxZ: 100,
};

export const PITCH_DECK_PATH = '/assets/resmart-pitch-deck.pdf';

/**
 * How long the CINEMATIC tour lingers on each zone before advancing.
 * Lives here (not in CameraRig.tsx) so ui/CinematicBar.tsx — which is
 * statically imported by app/page.tsx, outside the ssr:false boundary
 * around 3d/Experience.tsx — can read it without pulling three.js/
 * @react-three/fiber/@react-three/rapier into the main page bundle.
 */
export const CINEMATIC_DWELL_SECONDS = 6;

export const MARKET_METRICS = {
  usMarket: {
    value: 1_200_000_000_000,
    label: 'US Total Addressable Market',
    source: '[cite: 1]',
    assumption:
      'Derived from total US real estate services and PropTech transaction volume addressable by ReSmart AI.',
  },
  uaeMarket: {
    value: 12_000_000_000,
    label: 'UAE Serviceable Market',
    source: '[cite: 1]',
    assumption:
      'Based on UAE real estate brokerage and services market sizing used as the initial launch geography.',
  },
  regionalStock: {
    value: 4_500_000_000,
    label: 'Regional Stock Value',
    source: '[cite: 1]',
    assumption:
      'Estimated value of existing regional housing/asset stock addressable through the platform in early markets.',
  },
} satisfies Record<string, PitchMetric>;

export const FINANCIAL_METRICS = {
  yearOneARR: {
    value: 2_670_000,
    label: 'Year 1 ARR',
    source: '[cite: 1]',
    assumption:
      'Projected annual recurring revenue for Year 1 based on modeled customer and agent adoption rates.',
  },
  seedAsk: {
    value: 750_000,
    label: 'Seed Ask',
    source: '[cite: 1]',
    assumption:
      'Capital requested to fund 18 months of runway covering product, go-to-market, and initial operations.',
  },
  netMarginPerOrder: {
    value: 22.5,
    label: 'Net Margin per Order',
    source: '[cite: 1]',
    assumption:
      'Average net margin retained per completed transaction after platform, agent, and fulfillment costs.',
  },
} satisfies Record<string, PitchMetric>;

export const PITCH_METRICS: Record<string, PitchMetric> = {
  ...MARKET_METRICS,
  ...FINANCIAL_METRICS,
};

export const ZONES: ZoneDefinition[] = [
  {
    id: 'AI_SEARCH',
    title: 'AI Vision Search',
    description:
      'Holographic Search Lens: how ReSmart AI instantly surfaces the best nearby price on the item a customer wants.',
    position: [50, 0, 50],
    visibleTo: ['CUSTOMER', 'AGENT'],
    metricKeys: [],
    investorPitchLine: {
      text: 'ReSmart AI finds the lowest open-box/new price in your neighborhood within 3 seconds.',
      source: '[cite: 1]',
      assumption:
        'Based on measured search-to-result latency of the matching engine against nearby open-box and new listings.',
    },
  },
  {
    id: 'VERIFIED_AGENT',
    title: 'Certified Refurbished Merchant Station',
    description:
      'Tech test bench preview: how ReSmart Agents remove purchase risk by inspecting items before they ship.',
    position: [-50, 0, 50],
    visibleTo: ['CUSTOMER', 'AGENT'],
    metricKeys: ['netMarginPerOrder'],
    investorPitchLine: {
      text: 'ReSmart Agents eliminate buyer fear by physically testing gadgets before delivery ($22.50 net margin per order).',
      source: '[cite: 1]',
      assumption:
        'Agent verification cost and margin retained per order are drawn from FINANCIAL_METRICS.netMarginPerOrder.',
    },
  },
  {
    id: 'EXPRESS_DELIVERY',
    title: '2-Hour Express Delivery Ramp',
    description: 'Stunt ramp with a glowing countdown billboard: how fast a verified order reaches the customer.',
    position: [-50, 0, -50],
    visibleTo: ['CUSTOMER', 'AGENT'],
    metricKeys: [],
    investorPitchLine: {
      text: 'From checkout to your doorstep in under 120 minutes.',
      source: '[cite: 1]',
      assumption: 'Target delivery SLA for the initial launch geography, based on agent network density.',
    },
  },
  {
    id: 'TRACTION_ASK',
    title: 'Pitch & Traction Hub',
    description:
      'Neon billboard cluster showing market data, the ARR target, and the seed ask assumptions behind them.',
    position: [50, 0, -50],
    visibleTo: ['CUSTOMER', 'AGENT'],
    metricKeys: ['usMarket', 'seedAsk', 'yearOneARR'],
    investorPitchLine: {
      text: 'Raising $750K Seed Round for 10x ARR growth ($2.6M Target).',
      source: '[cite: 1]',
      assumption:
        'ARR target rounds FINANCIAL_METRICS.yearOneARR; growth multiple is modeled off current traction against the seed ask.',
    },
  },
];
