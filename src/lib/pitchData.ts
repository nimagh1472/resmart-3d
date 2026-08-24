import type {
  DistrictId,
  DistrictMetrics,
  InvestorRoiInputs,
  InvestorRoiResult,
  LeadRole,
  PitchMetric,
  RevenueStream,
  VoucherReward,
  WorldBounds,
} from '@/types';

/**
 * Single source of truth for every pitch figure, market/financial model, and
 * launch-campaign constant used across the landing page. Components must
 * import from here rather than hard-coding financial or market figures inline.
 */

export const WORLD_BOUNDS: WorldBounds = {
  minX: -100,
  maxX: 100,
  minZ: -100,
  maxZ: 100,
};

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
 * The 5 concurrent revenue streams behind FINANCIAL_METRICS.yearOneARR —
 * surfaced in the Investor Data Room so investors see the monetization
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
    label: 'Customer AI Premium Subscriptions',
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
 * Waitlist urgency pools for Customer/Merchant/Driver — `baseClaimed` seeds a
 * realistic "already filling up" starting count (so the counter never opens
 * at a suspicious 0/50); live submissions on top of this come from
 * /api/waitlist. Investor uses a separate flat capacity claim (see
 * INVESTOR_SEED_CAPACITY) rather than a spot pool.
 */
export const URGENCY_SPOTS: Record<Exclude<LeadRole, 'investor'>, { label: string; totalSpots: number; baseClaimed: number }> = {
  customer: { label: 'Early Voucher Spots', totalSpots: 50, baseClaimed: 38 },
  merchant: { label: 'Founding Merchant Slots', totalSpots: 50, baseClaimed: 28 },
  driver: { label: 'Zero-Commission Slots', totalSpots: 50, baseClaimed: 42 },
};

export const INVESTOR_SEED_CAPACITY = {
  label: 'Seed Round Capacity',
  reservedPct: 50,
  reservedForLabel: 'Qualified Angels/VCs',
};

/**
 * Real-world voucher conversion for the Customer role's early-access reward —
 * every qualifying signup is eligible for a AED 500 launch voucher.
 */
export const VOUCHER_CONVERSION = {
  customerVoucherValueAed: 500,
};

const VOUCHER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateVoucherCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += VOUCHER_CODE_CHARS[Math.floor(Math.random() * VOUCHER_CODE_CHARS.length)];
  }
  return `RESMART-${code}`;
}

/** Generates a one-time launch voucher reward for a qualifying Customer signup. */
export function calculateVoucherReward(): VoucherReward {
  return { voucherCount: 1, voucherValue: VOUCHER_CONVERSION.customerVoucherValueAed, code: generateVoucherCode() };
}

/**
 * Interactive ROI calculator behind the Investor Data Room's financial
 * sliders — lifted from the old driving-game's InvestorGame minigame model,
 * stripped of its gameplay scoring/telemetry. Simple, transparent profit
 * model: fleet size caps how many of the investor's target orders can
 * actually be fulfilled; the efficiency slider scales how much of the base
 * per-order margin is retained (better routing/fuel use = less margin lost);
 * staff/ops cost is a flat daily cost against gross profit.
 */
const ORDERS_PER_DRIVER_PER_DAY = 25;
// Reuses the same AED 22.5 net-margin-per-order figure the pitch deck cites
// elsewhere, so the calculator ties back to the rest of the financial
// narrative instead of inventing a new number.
const BASE_MARGIN_PER_ORDER_AED = FINANCIAL_METRICS.netMarginPerOrder.value;

interface SliderRange {
  min: number;
  max: number;
  step: number;
  default: number;
}

export const INVESTOR_ROI_INPUT_RANGES: Record<keyof InvestorRoiInputs, SliderRange> = {
  dailyTargetOrders: { min: 1_000, max: 100_000, step: 500, default: 20_000 },
  staffOpsCostAed: { min: 5_000, max: 200_000, step: 1_000, default: 40_000 },
  fleetSize: { min: 1, max: 500, step: 1, default: 50 },
  efficiencyPct: { min: 0, max: 100, step: 1, default: 70 },
};

export const DEFAULT_INVESTOR_ROI_INPUTS: InvestorRoiInputs = {
  dailyTargetOrders: INVESTOR_ROI_INPUT_RANGES.dailyTargetOrders.default,
  staffOpsCostAed: INVESTOR_ROI_INPUT_RANGES.staffOpsCostAed.default,
  fleetSize: INVESTOR_ROI_INPUT_RANGES.fleetSize.default,
  efficiencyPct: INVESTOR_ROI_INPUT_RANGES.efficiencyPct.default,
};

export function calculateInvestorRoi(inputs: InvestorRoiInputs): InvestorRoiResult {
  const maxFulfillableOrders = inputs.fleetSize * ORDERS_PER_DRIVER_PER_DAY;
  const ordersFulfilled = Math.min(inputs.dailyTargetOrders, maxFulfillableOrders);

  const marginMultiplier = 0.5 + (inputs.efficiencyPct / 100) * 0.5;
  const effectiveMarginPerOrder = BASE_MARGIN_PER_ORDER_AED * marginMultiplier;

  const grossProfitAed = ordersFulfilled * effectiveMarginPerOrder;
  const netProfitAed = grossProfitAed - inputs.staffOpsCostAed;

  const netMarginPct = grossProfitAed > 0 ? (netProfitAed / grossProfitAed) * 100 : -100;
  const roiPct = inputs.staffOpsCostAed > 0 ? (netProfitAed / inputs.staffOpsCostAed) * 100 : 0;

  return { ordersFulfilled, netProfitAed, netMarginPct, roiPct };
}
