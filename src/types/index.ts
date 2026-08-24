/** The four lead-capture personas the landing page targets. Used as the single role concept everywhere (there is no separate "gameplay role" anymore). */
export type LeadRole = 'shopper' | 'merchant' | 'driver' | 'investor';

export interface PitchMetric {
  value: number | string;
  label: string;
  source: string;
  assumption: string;
}

export interface RevenueStream {
  key: string;
  label: string;
  description: string;
}

export type DistrictId = 'downtown' | 'business-bay' | 'szr' | 'difc';

export interface DistrictMetrics {
  id: DistrictId;
  label: string;
  merchantDensity: number;
  aiRouteEfficiencyPct: number;
  regionalGmvAed: number;
}

export type VehicleType = 'motorcycle' | 'ev' | 'sedan';

export type TicketSizeBand = '100k-500k' | '500k-1m' | '1m-2m' | '2m-3.5m' | '3.5m-plus';

export interface ShopperLeadPayload {
  role: 'shopper';
  email: string;
}

export interface MerchantLeadPayload {
  role: 'merchant';
  storeName: string;
  businessContact: string;
  district: DistrictId;
}

export interface DriverLeadPayload {
  role: 'driver';
  email: string;
  vehicleType: VehicleType;
  licenseConfirmed: boolean;
}

export interface InvestorLeadPayload {
  role: 'investor';
  name: string;
  fundOrEntity: string;
  ticketSizeBand: TicketSizeBand;
  workEmailOrLinkedIn: string;
}

export type LeadPayload = ShopperLeadPayload | MerchantLeadPayload | DriverLeadPayload | InvestorLeadPayload;

export interface VoucherReward {
  voucherCount: number;
  voucherValue: number;
  code: string | null;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Inputs for the Investor Access modal's interactive Seed Scenario Model. */
export interface SeedScenarioInputs {
  seedAllocationAed: number;
  projectedMerchantScale: number;
}

export interface SeedScenarioResult {
  projectedArrAed: number;
  estimatedRunwayMonths: number;
  arrCoverageMultiple: number;
}
