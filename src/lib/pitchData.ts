import type {
  DistrictId,
  DistrictMetrics,
  LeadRole,
  PitchMetric,
  RevenueStream,
  SeedScenarioInputs,
  SeedScenarioResult,
  VoucherReward,
} from '@/types';

/**
 * Single source of truth for every pitch figure, market/financial model, and
 * launch-campaign constant used across the landing page. Components must
 * import from here rather than hard-coding financial or market figures inline.
 */

export const PITCH_DECK_PATH = '/assets/resmart-pitch-deck.pdf';

export const MARKET_METRICS = {
  dubaiTam: {
    value: 1_500_000_000,
    label: 'UAE / Dubai TAM',
    source: 'ReSmart AI Market Model, 2026',
    assumption: 'Commercial AI Search & Delivery market across the UAE, sized from local e-commerce and search-ad spend.',
  },
  businessBaySam: {
    value: 350_000_000,
    label: 'SAM — Downtown Dubai & Business Bay',
    source: 'ReSmart AI Market Model, 2026',
    assumption: 'Serviceable addressable market within the initial Downtown Dubai and Business Bay launch geography.',
  },
} satisfies Record<string, PitchMetric>;

export const FINANCIAL_METRICS = {
  yearOneARR: {
    value: 8_400_000,
    label: 'Year 1 Projected ARR',
    source: 'ReSmart AI Financial Model, 2026',
    assumption: 'Projected annual recurring revenue across all 5 revenue streams in Year 1 of the Dubai launch.',
  },
  seedAsk: {
    value: 3_500_000,
    label: 'Seed Funding Ask',
    source: 'ReSmart AI Financial Model, 2026',
    assumption: '18-month runway funding the AI Core Engine, merchant acquisition, and driver fleet scale-up.',
  },
  netMarginPerOrder: {
    value: 22.5,
    label: 'Net Margin per Order',
    source: 'ReSmart AI Financial Model, 2026',
    assumption:
      'Average net margin retained per completed transaction after platform, agent, and fulfillment costs.',
  },
} satisfies Record<string, PitchMetric>;

export const PITCH_METRICS: Record<string, PitchMetric> = {
  ...MARKET_METRICS,
  ...FINANCIAL_METRICS,
};

/**
 * Consolidated methodology footnote for the Investor Access modal's
 * TAM/SAM/ARR headline metrics — the per-metric `assumption`/`source` fields
 * above already carry the detail; this is the single "Assumptions & Sources"
 * disclosure toggle's combined text.
 */
export const METHODOLOGY_NOTE =
  'TAM/SAM figures are derived from local e-commerce and search-ad spend benchmarks scoped to the UAE and to the Downtown Dubai/Business Bay launch geography. Year-1 ARR is modeled bottom-up from the 5 revenue streams below at the merchant/driver adoption assumptions in the Seed Scenario Model. All figures are illustrative projections for this pre-launch demo, not audited financials or guarantees of performance.';

/**
 * The 5 concurrent revenue streams behind FINANCIAL_METRICS.yearOneARR —
 * surfaced in the Investor Access modal so investors see the monetization
 * structure, not just the resulting ARR total.
 */
export const REVENUE_STREAMS: RevenueStream[] = [
  {
    key: 'MERCHANT_SUBSCRIPTION',
    label: 'Merchant Membership Subscriptions',
    description: 'Monthly/annual SaaS tier for local stores.',
  },
  {
    key: 'MERCHANT_AD_SPEND',
    label: 'Merchant Daily Ad Network Spend',
    description: 'Sponsored AI search placements.',
  },
  {
    key: 'AFFILIATE_COMMISSION',
    label: '4% Affiliate Commission',
    description: 'Per completed merchant transaction.',
  },
  {
    key: 'CUSTOMER_PREMIUM',
    label: 'Shopper AI Premium Subscriptions',
    description: 'VIP deals & priority delivery matching.',
  },
  {
    key: 'LOGISTICS_FEE',
    label: 'Per-Order Logistics Fee',
    description: 'Micro-fee per driver delivery route.',
  },
];

/**
 * Dubai launch districts surfaced in the neon district selector — each has
 * its own illustrative density/efficiency/GMV figures so switching districts
 * visibly changes the page's stats rather than just relabeling a static card.
 */
export const DISTRICTS: DistrictMetrics[] = [
  { id: 'downtown', label: 'Downtown Dubai', merchantDensity: 420, aiRouteEfficiencyPct: 94, regionalGmvAed: 62_000_000 },
  { id: 'business-bay', label: 'Business Bay', merchantDensity: 365, aiRouteEfficiencyPct: 91, regionalGmvAed: 48_000_000 },
  { id: 'szr', label: 'Sheikh Zayed Road', merchantDensity: 510, aiRouteEfficiencyPct: 89, regionalGmvAed: 71_000_000 },
  { id: 'difc', label: 'DIFC', merchantDensity: 280, aiRouteEfficiencyPct: 96, regionalGmvAed: 55_000_000 },
];

export const DEFAULT_DISTRICT_ID: DistrictId = 'downtown';

/**
 * Network-wide founding target — distinct from DISTRICTS[].merchantDensity
 * (today's live per-district figures, ~1,575 combined). Surfaced as its own
 * static headline stat in the Network Effect scene, alongside — not instead
 * of — the interactive per-district breakdown.
 */
export const MERCHANT_NETWORK_TARGET = 500;

/**
 * Waitlist urgency pools for Merchant/Driver — `baseClaimed` seeds a
 * realistic "already filling up" starting count (so the counter never opens
 * at a suspicious 0/50); live submissions on top of this come from
 * /api/waitlist. Shopper uses the larger-scale SHOPPER_RANK_CONFIG rank
 * model instead (see below) rather than a small spot pool. Investor uses a
 * separate flat capacity claim (see INVESTOR_SEED_CAPACITY).
 */
export const URGENCY_SPOTS: Record<'merchant' | 'driver', { label: string; totalSpots: number; baseClaimed: number }> = {
  merchant: { label: 'Founding Merchant Slots', totalSpots: 50, baseClaimed: 28 },
  driver: { label: 'Zero-Commission Slots', totalSpots: 50, baseClaimed: 42 },
};

export const INVESTOR_SEED_CAPACITY = {
  label: 'Seed Round Capacity',
  reservedPct: 50,
  reservedForLabel: 'Qualified Angels/VCs',
};

/**
 * Real-world voucher conversion for the Shopper role's early-access reward —
 * every qualifying signup is eligible for a AED 500 launch voucher.
 */
export const VOUCHER_CONVERSION = {
  shopperVoucherValueAed: 500,
};

const VOUCHER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateVoucherCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += VOUCHER_CODE_CHARS[Math.floor(Math.random() * VOUCHER_CODE_CHARS.length)];
  }
  return `RESMART-${code}`;
}

/** Generates a one-time launch voucher reward for a qualifying Shopper signup. */
export function calculateVoucherReward(): VoucherReward {
  return { voucherCount: 1, voucherValue: VOUCHER_CONVERSION.shopperVoucherValueAed, code: generateVoucherCode() };
}

/**
 * Shopper growth-loop rank model: a much larger illustrative waitlist than
 * Merchant/Driver's 50-slot pools, with a "Top 50" tier every shopper is
 * chasing. Sharing nudges the visitor's rank down (toward #1); inviting a
 * friend who actually signs up nudges it down further. Tuned so ~2 invites
 * closes most of a typical seed-range gap to the Top 50 tier.
 */
export const SHOPPER_RANK_CONFIG = {
  totalWaitlistSize: 1_200,
  seedRangeMin: 150,
  seedRangeMax: 320,
  topTierRank: 50,
  topTierLabel: 'Top 50',
  pointsPerShare: 25,
  maxShareBoosts: 3,
  pointsPerInvite: 68,
};

/**
 * Interactive Seed Scenario Model behind the Investor Access modal's
 * post-qualification unlock. Transparent, two-input model: the merchant
 * scale slider drives projected ARR (via the ARR-per-merchant rate implied
 * by FINANCIAL_METRICS.yearOneARR and today's total district merchant
 * density, so it ties back to the published pitch figures instead of
 * inventing a new number); the seed allocation slider drives the estimated
 * runway (scaled off the existing "18-month runway" assumption behind the
 * AED 3.5M seed ask) and an ARR-coverage multiple.
 */
const TOTAL_CURRENT_MERCHANT_DENSITY = DISTRICTS.reduce((sum, district) => sum + district.merchantDensity, 0);
const ARR_PER_MERCHANT_AED = FINANCIAL_METRICS.yearOneARR.value / TOTAL_CURRENT_MERCHANT_DENSITY;
const BASE_RUNWAY_MONTHS = 18;

interface SliderRange {
  min: number;
  max: number;
  step: number;
  default: number;
}

export const SEED_SCENARIO_INPUT_RANGES: Record<keyof SeedScenarioInputs, SliderRange> = {
  seedAllocationAed: { min: 500_000, max: 3_500_000, step: 50_000, default: 1_500_000 },
  projectedMerchantScale: { min: 50, max: 2_000, step: 50, default: 400 },
};

export const DEFAULT_SEED_SCENARIO_INPUTS: SeedScenarioInputs = {
  seedAllocationAed: SEED_SCENARIO_INPUT_RANGES.seedAllocationAed.default,
  projectedMerchantScale: SEED_SCENARIO_INPUT_RANGES.projectedMerchantScale.default,
};

export function calculateSeedScenario(inputs: SeedScenarioInputs): SeedScenarioResult {
  const projectedArrAed = inputs.projectedMerchantScale * ARR_PER_MERCHANT_AED;
  const estimatedRunwayMonths = BASE_RUNWAY_MONTHS * (inputs.seedAllocationAed / FINANCIAL_METRICS.seedAsk.value);
  const arrCoverageMultiple = inputs.seedAllocationAed > 0 ? projectedArrAed / inputs.seedAllocationAed : 0;

  return { projectedArrAed, estimatedRunwayMonths, arrCoverageMultiple };
}

export const WAITLIST_ROLES: Array<Extract<LeadRole, 'shopper' | 'merchant' | 'driver'>> = ['shopper', 'merchant', 'driver'];
