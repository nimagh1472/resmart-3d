import { FINANCIAL_METRICS } from '@/lib/pitchData';

export interface InvestorInputs {
  dailyTargetOrders: number;
  staffOpsCostAed: number;
  fleetSize: number;
  efficiencyPct: number;
}

interface SliderRange {
  min: number;
  max: number;
  step: number;
  default: number;
}

export const INPUT_RANGES: Record<keyof InvestorInputs, SliderRange> = {
  dailyTargetOrders: { min: 1_000, max: 100_000, step: 500, default: 20_000 },
  staffOpsCostAed: { min: 5_000, max: 200_000, step: 1_000, default: 40_000 },
  fleetSize: { min: 1, max: 500, step: 1, default: 50 },
  efficiencyPct: { min: 0, max: 100, step: 1, default: 70 },
};

export const DEFAULT_INVESTOR_INPUTS: InvestorInputs = {
  dailyTargetOrders: INPUT_RANGES.dailyTargetOrders.default,
  staffOpsCostAed: INPUT_RANGES.staffOpsCostAed.default,
  fleetSize: INPUT_RANGES.fleetSize.default,
  efficiencyPct: INPUT_RANGES.efficiencyPct.default,
};

export const SIMULATION_DURATION_MS = 10_000;
/** Visual cap on animated fleet markers — fleetSize can go to 500, but rendering
 * that many instances is unnecessary for an illustrative orbit animation. */
export const VISUAL_FLEET_CAP = 40;

const ORDERS_PER_DRIVER_PER_DAY = 25;
// Reuses the same AED 22.5 net-margin-per-order figure the AGENT_VERIFY pitch
// station cites (see lib/pitchData.ts) — ties the simulation's math back to
// the rest of the pitch's financial narrative instead of inventing a new number.
const BASE_MARGIN_PER_ORDER_AED = FINANCIAL_METRICS.netMarginPerOrder.value;

export interface InvestorResult {
  actualOrders: number;
  maxFulfillableOrders: number;
  grossProfitAed: number;
  netProfitAed: number;
  netProfitMarginPct: number;
  roiPct: number;
  operationalEfficiencyScore: number; // 0-100
  leaderboardScore: number;
}

/**
 * Simple, transparent profit model: fleet size caps how many of the
 * investor's target orders can actually be fulfilled; the efficiency slider
 * scales how much of the base per-order margin is retained (better routing/
 * fuel use = less margin lost); staff/ops cost is a flat daily cost against
 * that gross profit. Operational efficiency score blends fulfillment ratio
 * (did the fleet meet the ambition?) with the raw efficiency input.
 */
export function calculateInvestorResult(inputs: InvestorInputs): InvestorResult {
  const maxFulfillableOrders = inputs.fleetSize * ORDERS_PER_DRIVER_PER_DAY;
  const actualOrders = Math.min(inputs.dailyTargetOrders, maxFulfillableOrders);

  const marginMultiplier = 0.5 + (inputs.efficiencyPct / 100) * 0.5;
  const effectiveMarginPerOrder = BASE_MARGIN_PER_ORDER_AED * marginMultiplier;

  const grossProfitAed = actualOrders * effectiveMarginPerOrder;
  const netProfitAed = grossProfitAed - inputs.staffOpsCostAed;

  const netProfitMarginPct = grossProfitAed > 0 ? (netProfitAed / grossProfitAed) * 100 : -100;
  const roiPct = inputs.staffOpsCostAed > 0 ? (netProfitAed / inputs.staffOpsCostAed) * 100 : 0;

  const fulfillmentRatio = Math.min(1, actualOrders / inputs.dailyTargetOrders);
  const operationalEfficiencyScore = Math.round(fulfillmentRatio * 50 + inputs.efficiencyPct * 0.5);

  const leaderboardScore = Math.max(
    0,
    Math.round(netProfitAed / 20 + operationalEfficiencyScore * 4 + Math.max(0, roiPct)),
  );

  return {
    actualOrders,
    maxFulfillableOrders,
    grossProfitAed,
    netProfitAed,
    netProfitMarginPct,
    roiPct,
    operationalEfficiencyScore,
    leaderboardScore,
  };
}

export type InvestorSimPhase = 'IDLE' | 'RUNNING' | 'COMPLETE';

/**
 * Module-level mutable simulation telemetry — same pattern as
 * driverGameState.ts/customerGameState.ts: InvestorGame.tsx's dashboard
 * (plain DOM, outside the Canvas) writes to this on Run/tick, and
 * InvestorSimulationScene.tsx (inside Experience.tsx's Canvas) reads it every
 * frame to animate the fleet / holographic ROI chart, without routing a
 * 60fps-relevant value through React state.
 */
export const investorSimTelemetry = {
  phase: 'IDLE' as InvestorSimPhase,
  fleetSize: DEFAULT_INVESTOR_INPUTS.fleetSize,
  efficiencyPct: DEFAULT_INVESTOR_INPUTS.efficiencyPct,
  progress: 0,
  result: null as InvestorResult | null,
};

export function resetInvestorSimTelemetry() {
  investorSimTelemetry.phase = 'IDLE';
  investorSimTelemetry.progress = 0;
  investorSimTelemetry.result = null;
}
