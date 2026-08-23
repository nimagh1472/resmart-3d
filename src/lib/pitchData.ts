import type {
  BusinessFeature,
  BusinessFeatureKey,
  CashbackPickup,
  PitchMetric,
  StationDefinition,
  StoryChapterDef,
  StoryRoleKey,
  VoucherReward,
  WorldBounds,
} from '@/types';

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
 * Downtown Dubai landmark references driving World.tsx's layout: a Burj
 * Khalifa-inspired central tower ringed by a Sheikh Mohammed bin Rashid
 * Boulevard-style curved road, with a Dubai Mall / Dubai Fountain district
 * off to one side.
 */
export const DUBAI_LANDMARKS = {
  CENTRAL_TOWER_POSITION: [0, 0, 0] as [number, number, number],
  // The vehicle is a fully scripted kinematic body (see Vehicle.tsx) — it
  // never reacts to Rapier collisions, so the Central Tower's "no driving
  // through it" behavior is enforced by Vehicle.tsx pushing the vehicle's
  // computed position out to this radius, not by a physics collider.
  CENTRAL_TOWER_EXCLUSION_RADIUS: 9.5,
  BOULEVARD_INNER_RADIUS: 14,
  BOULEVARD_OUTER_RADIUS: 24,
  MALL_DISTRICT_CENTER: [45, 0, 45] as [number, number, number],
  // Kept well clear of CUSTOMER_STORE's 6-unit trigger radius (also at
  // [45,0,45]) and its HolographicSearchLens feature at [45,0,41].
  FOUNTAIN_POSITION: [45, 0, 26] as [number, number, number],
};

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
    title: 'AI Vision Search — Dubai Mall Hub',
    description:
      'Holographic Search Lens outside the Dubai Mall district: drive in to trigger an AI scan revealing lower prices and open-box deals nearby.',
    position: [45, 0, 45],
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
    title: 'Boulevard Express Ramp',
    description:
      'Stunt ramp beside the Central Tower boulevard, with a glowing countdown billboard: place your order with a guaranteed sub-2-hour ETA.',
    position: [0, 0, -34],
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
    title: 'ReSmart Hub — The Boulevard',
    description: 'Dispatch kiosk on the Boulevard: accept a live customer order and start the delivery run.',
    position: [-45, 0, 45],
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
    title: 'Merchant Test Station',
    description:
      'Certified Refurbished tech test bench: physically verify the gadget condition before it ships and earn a testing fee.',
    position: [-45, 0, -45],
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
    title: 'Express Drop-off — City Center',
    description:
      'Speed ramp finish line across the city center from the Boulevard hub: complete the delivery, launch the confetti, and bank your earnings.',
    position: [45, 0, -45],
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

/** Cashback Gems — Story B, Chapter 2: collect all 3 while cruising the Boulevard ring. */
export const CASHBACK_PICKUPS: CashbackPickup[] = [
  { id: 'cashback-1', position: [18, 0, 8], amount: 8 },
  { id: 'cashback-2', position: [-15, 0, 12], amount: 5 },
  { id: 'cashback-3', position: [2, 0, -19], amount: 12 },
];

/**
 * Story-driven campaign copy for both roles, shown by ui/StoryHUD.tsx.
 * Chapter progression itself is tracked/advanced in hooks/useRoleStore.ts;
 * this is purely the narrative text for each chapter.
 */
export const CAMPAIGN_TITLES: Record<StoryRoleKey, string> = {
  CUSTOMER: 'The Smart Shopper',
  AGENT: 'The Certified Hero',
};

export const STORY_CHAPTERS: Record<StoryRoleKey, StoryChapterDef[]> = {
  CUSTOMER: [
    {
      title: 'Chapter 1: The Price Hunt',
      guideDialogue:
        "Every dirham counts. Drive to the AI Vision Search hub near Dubai Mall — let's scan local store prices and prove we can save you $200+.",
      objective: 'Reach the AI Vision Search Hub near Dubai Mall',
    },
    {
      title: 'Chapter 2: Boulevard Bounty',
      guideDialogue:
        'Nice find! Now cruise the Boulevard around the Central Tower and collect all 3 floating Cashback Gems — free money, no catch.',
      objective: 'Collect 3 Cashback Gems',
    },
    {
      title: 'Chapter 3: The Guarantee',
      guideDialogue:
        "One more stop. Hit the 2-Hour Express Ramp near the Central Tower and lock in your first guaranteed instant order.",
      objective: 'Place your order at the Boulevard Express Ramp',
    },
  ],
  AGENT: [
    {
      title: 'Chapter 1: The Call',
      guideDialogue:
        'An urgent delivery just came in. Get to the ReSmart Hub on the Boulevard and accept the order.',
      objective: 'Accept the urgent order at the ReSmart Hub',
    },
    {
      title: 'Chapter 2: Trust, Verified',
      guideDialogue:
        "Before it ships, prove it's good. Drive to the Merchant Test Station, inspect the gadget, and stamp it Certified Verified.",
      objective: 'Certify the gadget at the Merchant Test Station ($25 fee)',
    },
    {
      title: 'Chapter 3: Race the Clock',
      guideDialogue:
        "The clock's running. Cross the city center and hit the Express Drop-off before the 2-hour timer runs out.",
      objective: 'Complete the Express Drop-off before time runs out',
    },
  ],
};

/**
 * Real-world voucher conversion: every $1,000 earned/saved in-game converts
 * to a $5 Real Off voucher, redeemable at ReSmart launch. A full campaign
 * playthrough's wallet total is topped up with a completion bonus so a
 * finished campaign always clears at least one voucher tier.
 */
export const VOUCHER_CONVERSION = {
  earningsPerVoucher: 1000,
  voucherValuePerTier: 5,
};

export const CAMPAIGN_COMPLETION_BONUS: Record<StoryRoleKey, number> = {
  CUSTOMER: 900,
  AGENT: 900,
};

const VOUCHER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateVoucherCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += VOUCHER_CODE_CHARS[Math.floor(Math.random() * VOUCHER_CODE_CHARS.length)];
  }
  return `RESMART-${code}`;
}

/** Pure conversion of total in-game earnings/savings into a real-world voucher reward. */
export function calculateVoucherReward(totalEarnings: number): VoucherReward {
  const voucherCount = Math.floor(totalEarnings / VOUCHER_CONVERSION.earningsPerVoucher);
  const voucherValue = voucherCount * VOUCHER_CONVERSION.voucherValuePerTier;
  return { voucherCount, voucherValue, code: voucherCount > 0 ? generateVoucherCode() : null };
}

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
