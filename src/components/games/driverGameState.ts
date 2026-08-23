export const LANE_COUNT = 3;
export const LANE_WIDTH = 3.4;
export const LANE_X_POSITIONS: number[] = [-LANE_WIDTH, 0, LANE_WIDTH];

export const ROAD_LENGTH = 640;
export const ROAD_START_Z = 0;

export const BASE_FORWARD_SPEED = 24; // units/sec
export const BOOST_SPEED_MULTIPLIER = 1.7;
export const BOOST_DURATION_MS = 1300;
export const SLOW_SPEED_MULTIPLIER = 0.4;
export const SLOW_DURATION_MS = 900;

export const NODE_TRIGGER_RADIUS = 1.6;
export const OBSTACLE_TRIGGER_RADIUS = 1.6;

// Scoring — see calculateDriverScore(). Independent of the AED earnings
// system (useRoleStore); feeds useUserProfileStore's leaderboard score.
export const TIME_BUDGET_SECONDS = 34;
export const TIME_SCORE_PER_SECOND = 25;
export const POINTS_PER_NODE = 60;
export const PENALTY_PER_COLLISION = 40;
export const ZERO_COLLISION_BONUS = 300;

export type DriverGamePhase = 'COUNTDOWN' | 'RUNNING' | 'FINISHED';

export interface TrackItem {
  id: string;
  kind: 'obstacle' | 'node';
  lane: number;
  z: number;
}

/**
 * Deterministic seeded PRNG (mulberry32) — every player faces the identical
 * obstacle/node layout, which keeps the leaderboard's score comparisons fair
 * (no player benefits from an easier random layout than another).
 */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TRACK_SEED = 20260822;
const SEGMENT_LENGTH = 16;
const TRACK_START_Z = 40;
const TRACK_END_MARGIN = 24;

/** Fixed lane/obstacle/node layout for the run, generated once at module load. */
export function generateTrack(): TrackItem[] {
  const rng = mulberry32(TRACK_SEED);
  const items: TrackItem[] = [];
  let nextId = 0;

  for (let z = TRACK_START_Z; z < ROAD_LENGTH - TRACK_END_MARGIN; z += SEGMENT_LENGTH) {
    const roll = rng();
    if (roll < 0.5) {
      items.push({ id: `obstacle-${nextId++}`, kind: 'obstacle', lane: Math.floor(rng() * LANE_COUNT), z: z + rng() * 4 });
    } else if (roll < 0.85) {
      items.push({ id: `node-${nextId++}`, kind: 'node', lane: Math.floor(rng() * LANE_COUNT), z: z + rng() * 4 });
    } else {
      const obstacleLane = Math.floor(rng() * LANE_COUNT);
      const nodeLane = (obstacleLane + 1 + Math.floor(rng() * (LANE_COUNT - 1))) % LANE_COUNT;
      items.push({ id: `obstacle-${nextId++}`, kind: 'obstacle', lane: obstacleLane, z: z + rng() * 3 });
      items.push({ id: `node-${nextId++}`, kind: 'node', lane: nodeLane, z: z + 7 + rng() * 3 });
    }
  }

  return items;
}

export const TOTAL_NODE_COUNT = generateTrack().filter((item) => item.kind === 'node').length;

/**
 * Module-level mutable lane-input state — same pattern as
 * useKeyboardControls.ts's controlsState: input written at keypress/tap rate,
 * read every frame by DriverGameScene's useFrame, deliberately outside
 * React/Zustand so it never triggers a re-render.
 */
export const driverControlsState = {
  lane: 1,
};

export function requestLaneChange(delta: number) {
  driverControlsState.lane = Math.max(0, Math.min(LANE_COUNT - 1, driverControlsState.lane + delta));
}

/**
 * Module-level mutable run telemetry — the read side of the same pattern,
 * mirroring useVehicleTelemetry.ts: DriverGameScene writes to this every
 * frame (car's world-Z, live counters), DriverGame.tsx's HUD polls it via
 * requestAnimationFrame and writes to the DOM/state at a throttled cadence.
 */
export const driverGameTelemetry = {
  phase: 'COUNTDOWN' as DriverGamePhase,
  z: ROAD_START_Z,
  nodesCollected: 0,
  collisionCount: 0,
  speedMultiplier: 1,
  elapsedSeconds: 0,
};

export function resetDriverGameTelemetry() {
  driverGameTelemetry.phase = 'COUNTDOWN';
  driverGameTelemetry.z = ROAD_START_Z;
  driverGameTelemetry.nodesCollected = 0;
  driverGameTelemetry.collisionCount = 0;
  driverGameTelemetry.speedMultiplier = 1;
  driverGameTelemetry.elapsedSeconds = 0;
  driverControlsState.lane = 1;
}

export interface DriverScoreBreakdown {
  timeScore: number;
  nodeScore: number;
  collisionPenalty: number;
  zeroCollisionBonus: number;
  total: number;
}

export function calculateDriverScore(elapsedSeconds: number, nodesCollected: number, collisionCount: number): DriverScoreBreakdown {
  const timeScore = Math.round(Math.max(0, TIME_BUDGET_SECONDS - elapsedSeconds) * TIME_SCORE_PER_SECOND);
  const nodeScore = nodesCollected * POINTS_PER_NODE;
  const collisionPenalty = collisionCount * PENALTY_PER_COLLISION;
  const zeroCollisionBonus = collisionCount === 0 ? ZERO_COLLISION_BONUS : 0;
  const total = Math.max(0, timeScore + nodeScore - collisionPenalty + zeroCollisionBonus);
  return { timeScore, nodeScore, collisionPenalty, zeroCollisionBonus, total };
}
