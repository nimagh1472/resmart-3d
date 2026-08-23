export const LANE_COUNT = 3;
export const LANE_WIDTH = 3.4;
export const LANE_X_POSITIONS: number[] = [-LANE_WIDTH, 0, LANE_WIDTH];

export const ROAD_LENGTH = 560;
export const ROAD_START_Z = 0;

export const BASE_FORWARD_SPEED = 22; // units/sec — constant; unlike DriverGame, this game's
// tension is pick-precision under instant-death risk, not speed modulation.

export const ITEM_TRIGGER_RADIUS = 1.6;
export const POINTS_PER_ITEM = 100;

export const TARGET_PRODUCT_NAME = 'ReSmart Express Parcel';

export type CustomerGamePhase = 'COUNTDOWN' | 'RUNNING' | 'FINISHED' | 'GAME_OVER';
export type CustomerItemKind = 'target' | 'wrong';

export interface CustomerTrackItem {
  id: string;
  kind: CustomerItemKind;
  lane: number;
  z: number;
}

/** Deterministic seeded PRNG (mulberry32) — same fairness rationale as driverGameState.ts:
 * every player faces the identical item layout, so leaderboard comparisons stay fair. */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TRACK_SEED = 20260823;
const SEGMENT_LENGTH = 18;
const TRACK_START_Z = 40;
const TRACK_END_MARGIN = 24;

/**
 * Fixed lane layout for the run. Each segment is one of:
 * - a "choice" wave: exactly one target lane + wrong items filling the rest,
 *   forcing the player to pick the correct lane;
 * - a free target lane with the other two empty;
 * - an empty breather segment.
 */
export function generateTrack(): CustomerTrackItem[] {
  const rng = mulberry32(TRACK_SEED);
  const items: CustomerTrackItem[] = [];
  let nextId = 0;

  for (let z = TRACK_START_Z; z < ROAD_LENGTH - TRACK_END_MARGIN; z += SEGMENT_LENGTH) {
    const roll = rng();
    const targetLane = Math.floor(rng() * LANE_COUNT);
    const jitter = rng() * 3;

    if (roll < 0.5) {
      // Choice wave: one correct lane, wrong items in the other two.
      for (let lane = 0; lane < LANE_COUNT; lane += 1) {
        items.push({
          id: `item-${nextId++}`,
          kind: lane === targetLane ? 'target' : 'wrong',
          lane,
          z: z + jitter,
        });
      }
    } else if (roll < 0.85) {
      // Free target — other lanes left open to pass through safely.
      items.push({ id: `item-${nextId++}`, kind: 'target', lane: targetLane, z: z + jitter });
    }
    // else: breather segment, no items.
  }

  return items;
}

export const TOTAL_TARGET_COUNT = generateTrack().filter((item) => item.kind === 'target').length;

/** Module-level mutable lane-input state — same pattern as driverGameState.ts / useKeyboardControls.ts. */
export const customerControlsState = {
  lane: 1,
};

export function requestLaneChange(delta: number) {
  customerControlsState.lane = Math.max(0, Math.min(LANE_COUNT - 1, customerControlsState.lane + delta));
}

/** Module-level mutable run telemetry — written every frame by CustomerGameScene, polled by CustomerGame.tsx's HUD. */
export const customerGameTelemetry = {
  phase: 'COUNTDOWN' as CustomerGamePhase,
  z: ROAD_START_Z,
  correctPicks: 0,
};

export function resetCustomerGameTelemetry() {
  customerGameTelemetry.phase = 'COUNTDOWN';
  customerGameTelemetry.z = ROAD_START_Z;
  customerGameTelemetry.correctPicks = 0;
  customerControlsState.lane = 1;
}

export function calculateCustomerScore(correctPicks: number): number {
  return correctPicks * POINTS_PER_ITEM;
}
