export type PresentationMode = 'INTERACTIVE' | 'GUIDED' | 'CINEMATIC';

export type RoleType = 'CUSTOMER' | 'AGENT' | null;

export interface PitchMetric {
  value: number | string;
  label: string;
  source: string;
  assumption: string;
}

export type ZoneId = 'AI_SEARCH' | 'VERIFIED_AGENT' | 'EXPRESS_DELIVERY' | 'TRACTION_ASK';

export interface InvestorPitchLine {
  text: string;
  source: string;
  assumption: string;
}

export interface ZoneDefinition {
  id: ZoneId;
  title: string;
  description: string;
  position: [number, number, number];
  visibleTo: Array<Exclude<RoleType, null>>;
  metricKeys: string[];
  investorPitchLine: InvestorPitchLine;
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
