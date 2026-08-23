export type PresentationMode = 'INTERACTIVE' | 'GUIDED' | 'CINEMATIC';

export type RoleType = 'CUSTOMER' | 'AGENT' | null;

export interface PitchMetric {
  value: number | string;
  label: string;
  source: string;
  assumption: string;
}

export type StationId =
  | 'CUSTOMER_STORE'
  | 'CUSTOMER_EXPRESS'
  | 'AGENT_DISPATCH'
  | 'AGENT_VERIFY'
  | 'AGENT_DROPOFF'
  | 'TRACTION_ASK';

export interface InvestorPitchLine {
  text: string;
  source: string;
  assumption: string;
}

export interface StationDefinition {
  id: StationId;
  title: string;
  description: string;
  position: [number, number, number];
  visibleTo: Array<Exclude<RoleType, null>>;
  metricKeys: string[];
  investorPitchLine: InvestorPitchLine;
  /** If set, this station only rewards once the referenced station's role-specific gate has been satisfied. */
  requiresStation?: StationId;
}

export interface CashbackPickup {
  id: string;
  position: [number, number, number];
  amount: number;
}

export type BusinessFeatureKey = 'AI_COMPARISON' | 'CASHBACK_REWARDS' | 'DELIVERY_GUARANTEE' | 'AGENT_EARNINGS';

export interface BusinessFeature {
  key: BusinessFeatureKey;
  title: string;
  description: string;
}

export type AgentOrderStage = 'IDLE' | 'DISPATCHED' | 'VERIFIED';

export interface FeaturePopup {
  id: number;
  kind: 'FEATURE' | 'REWARD';
  title: string;
  description?: string;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface VehicleControlsState {
  forward: number;
  turn: number;
  boost: boolean;
}
