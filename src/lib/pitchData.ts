import type { BusinessFeature, BusinessFeatureKey, CashbackPickup, PitchMetric, StationDefinition, WorldBounds } from '@/types';

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

export const STATIONS: StationDefinition[] = [
  {
    id: 'CUSTOMER_STORE',
    title: 'Store Station',
    description:
      'Holographic Search Lens: drive in to trigger an AI scan revealing lower prices and open-box deals nearby.',
    position: [60, 0, 60],
    visibleTo: ['CUSTOMER'],
    metricKeys: [],
    investorPitchLine: {
      text: 'ReSmart AI finds the lowest open-box/new price in your neighborhood within 3 seconds.',
      source: '[cite: 1]',
      assumption:
        'Based on measured search-to-result latency of the matching engine against nearby open-box and new listings.',
    },
  },
  {
    id: 'CUSTOMER_EXPRESS',
    title: 'Express Pickup Ramp',
    description: 'Stunt ramp with a glowing countdown billboard: place your order with a guaranteed sub-2-hour ETA.',
    position: [60, 0, -60],
    visibleTo: ['CUSTOMER'],
    metricKeys: [],
    investorPitchLine: {
      text: 'From checkout to your doorstep in under 120 minutes.',
      source: '[cite: 1]',
      assumption: 'Target delivery SLA for the initial launch geography, based on agent network density.',
    },
  },
  {
    id: 'AGENT_DISPATCH',
    title: 'Pickup Station',
    description: 'Dispatch kiosk: accept a live customer order and start the delivery run.',
    position: [-60, 0, 60],
    visibleTo: ['AGENT'],
    metricKeys: [],
    investorPitchLine: {
      text: 'Every order is matched to the nearest available ReSmart Agent in real time.',
      source: '[cite: 1]',
      assumption: 'Dispatch latency modeled off current agent network density in the launch geography.',
    },
  },
  {
    id: 'AGENT_VERIFY',
    title: 'Certified Refurbished Merchant Station',
    description:
      'Tech test bench: physically verify the gadget condition before it ships and earn a testing fee.',
    position: [-60, 0, 0],
    visibleTo: ['AGENT'],
    metricKeys: ['netMarginPerOrder'],
    requiresStation: 'AGENT_DISPATCH',
    investorPitchLine: {
      text: 'ReSmart Agents eliminate buyer fear by physically testing gadgets before delivery ($22.50 net margin per order).',
      source: '[cite: 1]',
      assumption:
        'Agent verification cost and margin retained per order are drawn from FINANCIAL_METRICS.netMarginPerOrder.',
    },
  },
  {
    id: 'AGENT_DROPOFF',
    title: 'Express Drop-off',
    description: 'Speed ramp finish line: complete the delivery, launch the confetti, and bank your earnings.',
    position: [-60, 0, -60],
    visibleTo: ['AGENT'],
    metricKeys: [],
    requiresStation: 'AGENT_VERIFY',
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
    position: [0, 0, -80],
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

export const CASHBACK_PICKUPS: CashbackPickup[] = [
  { id: 'cashback-1', position: [30, 0, 30], amount: 8 },
  { id: 'cashback-2', position: [45, 0, 10], amount: 5 },
  { id: 'cashback-3', position: [15, 0, 45], amount: 12 },
  { id: 'cashback-4', position: [55, 0, 25], amount: 15 },
];

export const BUSINESS_FEATURES: Record<BusinessFeatureKey, BusinessFeature> = {
  AI_COMPARISON: {
    key: 'AI_COMPARISON',
    title: 'AI Price Comparison',
    description: 'ReSmart AI scans nearby stores in seconds and surfaces the lowest new & open-box price automatically.',
  },
  CASHBACK_REWARDS: {
    key: 'CASHBACK_REWARDS',
    title: 'Cashback Rewards',
    description: 'Every ReSmart purchase earns instant cashback credit straight into your wallet — no waiting.',
  },
  DELIVERY_GUARANTEE: {
    key: 'DELIVERY_GUARANTEE',
    title: '2-Hour Delivery Guarantee',
    description: 'Verified orders reach your doorstep in under 2 hours, powered by our local agent network.',
  },
  AGENT_EARNINGS: {
    key: 'AGENT_EARNINGS',
    title: 'Agent Earning Model',
    description: 'ReSmart Agents earn a testing fee plus a delivery bonus on every verified order they complete.',
  },
};

/** Inclusive random integer-ish dollar amount, e.g. for the $15–$25 verification fee. */
export function randomInRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}
