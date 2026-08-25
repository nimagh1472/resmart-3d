/**
 * Single source of truth for Spatial V2 — the scroll-driven successor to
 * the time-driven cinematic in src/lib/cinematicManifest.ts. Same
 * philosophy (one authored asset per beat, continuous per-asset motion
 * instead of a slideshow), but progress is a scroll fraction (0-1 across
 * the whole sticky sequence) instead of elapsed seconds, and desktop/
 * mobile get dedicated authored images instead of one image + object-
 * position tricks — the 9 approved renders each ship a purpose-built
 * portrait companion, not a crop of the landscape one.
 *
 * Isolated build: consumed only by src/app/lab/spatial-v2/page.tsx. Not
 * wired into the production homepage yet.
 */

export interface SpatialKenBurns {
  zoomFrom: number;
  zoomTo: number;
  panXFrom: number;
  panXTo: number;
  panYFrom: number;
  panYTo: number;
}

export interface SpatialFraming {
  /** Deliberately per-scene, per-breakpoint — no shared/default object-position. */
  objectPosition: string;
  kenBurns: SpatialKenBurns;
}

export interface SpatialAssetSlot {
  /** Matches a key in spatialAssets.ts. */
  id: string;
  desktop: SpatialFraming;
  mobile: SpatialFraming;
  note: string;
  /** Ken Burns overscan margin (%) — defaults to 4 in SpatialLayer; override to 0 for dense edge-to-edge art that can't afford any crop. */
  overscanPercent?: number;
}

export type OverlayKind =
  | 'pulse'
  | 'intent'
  | 'search'
  | 'match-glow'
  | 'transaction-pulse'
  | 'chase-route'
  | 'delivery-pulse'
  | 'network-live'
  | 'brand-text'
  | 'persona-grid'
  | null;

export interface SpatialBeat {
  index: number;
  key: string;
  name: string;
  /** Relative scroll-length weight — converted to vh in SpatialStage. */
  heightVh: number;
  asset: SpatialAssetSlot | null;
  overlay: OverlayKind;
  /** Filled in by buildBeats() below — fractions of the whole sequence (0-1). */
  start: number;
  end: number;
}

// ---- Asset slots -----------------------------------------------------
// One constant per approved render, each carrying its own bespoke
// desktop AND mobile framing — deliberately not derived from a shared
// default, per the "no generic object-fit rule" directive. Reused across
// multiple beats (e.g. SHOPPER_SLOT backs both "Shopper Intent" and
// "Search") the same way cinematicManifest.ts reuses DUBAI_ESTABLISHING_SHOT
// across consecutive scenes — motion stays continuous across the shared
// window instead of resetting per-beat.

const DUBAI_SLOT: SpatialAssetSlot = {
  id: 'dubai',
  note: 'Clean night establishing skyline, Burj Khalifa + Dubai Mall + Fountain.',
  desktop: {
    objectPosition: '50% 45%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.1, panXFrom: 0, panXTo: -1, panYFrom: 0, panYTo: -1 },
  },
  mobile: {
    objectPosition: '48% 40%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.08, panXFrom: 0, panXTo: 0, panYFrom: 0, panYTo: -1 },
  },
};

const SHOPPER_SLOT: SpatialAssetSlot = {
  id: 'shopper',
  note: 'Shopper on the promenade with a phone, Burj Khalifa across the water. No baked UI — carries the Intent/Search overlay.',
  desktop: {
    objectPosition: '30% 55%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.09, panXFrom: 0, panXTo: -1, panYFrom: 0, panYTo: 0 },
  },
  mobile: {
    objectPosition: '38% 55%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.07, panXFrom: 0, panXTo: 0, panYFrom: 0, panYTo: -1 },
  },
};

const MERCHANT_SLOT: SpatialAssetSlot = {
  id: 'merchant',
  note: 'Urban Tech storefront, Burj Khalifa far left, promenade. No baked UI.',
  desktop: {
    objectPosition: '68% 52%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.06, panXFrom: 1, panXTo: -1, panYFrom: 0, panYTo: 0 },
  },
  mobile: {
    objectPosition: '55% 55%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.05, panXFrom: 0, panXTo: 0, panYFrom: 0, panYTo: 0 },
  },
};

const TRANSACTION_SLOT: SpatialAssetSlot = {
  id: 'transaction',
  note: 'Same storefront, now with baked CONFIRMED card + beam — do not duplicate with an overlay card.',
  desktop: {
    objectPosition: '58% 55%',
    kenBurns: { zoomFrom: 1.02, zoomTo: 1.08, panXFrom: 0, panXTo: -1, panYFrom: 0, panYTo: 0 },
  },
  mobile: {
    objectPosition: '55% 52%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.06, panXFrom: 0, panXTo: 0, panYFrom: 0, panYTo: 0 },
  },
};

const CHASE_SLOT: SpatialAssetSlot = {
  id: 'chase',
  note: 'ReSmart vehicle driving toward camera, Burj Khalifa left-center. No baked UI.',
  desktop: {
    objectPosition: '62% 60%',
    kenBurns: { zoomFrom: 1.03, zoomTo: 1.1, panXFrom: 2, panXTo: -2, panYFrom: 0, panYTo: 1 },
  },
  mobile: {
    objectPosition: '50% 62%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.07, panXFrom: 0, panXTo: 0, panYFrom: 0, panYTo: 1 },
  },
};

const DELIVERY_SLOT: SpatialAssetSlot = {
  id: 'delivery',
  note: 'Handoff at the door, baked DELIVERY CONFIRMED card + beam — do not duplicate with an overlay card.',
  desktop: {
    objectPosition: '60% 58%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.07, panXFrom: -1, panXTo: 1, panYFrom: 0, panYTo: 0 },
  },
  mobile: {
    objectPosition: '55% 55%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.05, panXFrom: 0, panXTo: 0, panYFrom: 0, panYTo: 0 },
  },
};

const PULLBACK_SLOT: SpatialAssetSlot = {
  id: 'pullback',
  note: 'Aerial reveal, baked delivery cards + routes across the city — camera pulls BACK to match the beat name.',
  desktop: {
    objectPosition: '50% 46%',
    kenBurns: { zoomFrom: 1.12, zoomTo: 1.0, panXFrom: 0, panXTo: 0, panYFrom: 0.5, panYTo: -0.5 },
  },
  mobile: {
    objectPosition: '50% 42%',
    kenBurns: { zoomFrom: 1.1, zoomTo: 1.0, panXFrom: 0, panXTo: 0, panYFrom: 0.5, panYTo: -0.5 },
  },
};

const NETWORK_SLOT: SpatialAssetSlot = {
  id: 'network',
  note: 'Dense baked dashboard (stat cards to the frame edges, incl. the LIVE badge at the very top-right) — no zoom/pan and near-zero overscan, any crop cuts real content.',
  overscanPercent: 0.5,
  desktop: {
    objectPosition: '50% 50%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.0, panXFrom: 0, panXTo: 0, panYFrom: 0, panYTo: 0 },
  },
  mobile: {
    objectPosition: '50% 42%',
    kenBurns: { zoomFrom: 1.0, zoomTo: 1.0, panXFrom: 0, panXTo: 0, panYFrom: 0, panYTo: 0 },
  },
};

const SIGNATURE_SLOT: SpatialAssetSlot = {
  id: 'signature',
  note: 'Sunset hero shot with its own baked headline/logo/tagline — backs Signature Dubai, THIS IS RESMART, and the closing persona beat.',
  desktop: {
    objectPosition: '50% 50%',
    kenBurns: { zoomFrom: 1.05, zoomTo: 1.0, panXFrom: 0, panXTo: 0, panYFrom: 0.4, panYTo: 0 },
  },
  mobile: {
    objectPosition: '50% 45%',
    kenBurns: { zoomFrom: 1.05, zoomTo: 1.0, panXFrom: 0, panXTo: 0, panYFrom: 0.4, panYTo: 0 },
  },
};

// ---- Beats -------------------------------------------------------------

type RawBeat = Omit<SpatialBeat, 'start' | 'end'>;

const RAW_BEATS: RawBeat[] = [
  { index: 1, key: 'pulse', name: 'Black / Pulse', heightVh: 70, asset: null, overlay: 'pulse' },
  { index: 2, key: 'dubai', name: 'Dubai', heightVh: 150, asset: DUBAI_SLOT, overlay: null },
  { index: 3, key: 'shopper-intent', name: 'Shopper Intent', heightVh: 100, asset: SHOPPER_SLOT, overlay: 'intent' },
  { index: 4, key: 'search', name: 'Search', heightVh: 80, asset: SHOPPER_SLOT, overlay: 'search' },
  { index: 5, key: 'merchant-match', name: 'Merchant Match', heightVh: 100, asset: MERCHANT_SLOT, overlay: 'match-glow' },
  { index: 6, key: 'transaction', name: 'Transaction', heightVh: 90, asset: TRANSACTION_SLOT, overlay: 'transaction-pulse' },
  { index: 7, key: 'chase', name: 'Chase', heightVh: 100, asset: CHASE_SLOT, overlay: 'chase-route' },
  { index: 8, key: 'delivery', name: 'Delivery', heightVh: 100, asset: DELIVERY_SLOT, overlay: 'delivery-pulse' },
  { index: 9, key: 'pullback', name: 'Pullback', heightVh: 90, asset: PULLBACK_SLOT, overlay: null },
  { index: 10, key: 'living-network', name: 'Living Network', heightVh: 150, asset: NETWORK_SLOT, overlay: 'network-live' },
  { index: 11, key: 'signature', name: 'Signature Dubai', heightVh: 130, asset: SIGNATURE_SLOT, overlay: null },
  { index: 12, key: 'brand', name: 'THIS IS RESMART', heightVh: 90, asset: SIGNATURE_SLOT, overlay: 'brand-text' },
  { index: 13, key: 'personas', name: 'Shop / Sell / Drive / Invest', heightVh: 100, asset: SIGNATURE_SLOT, overlay: 'persona-grid' },
];

function buildBeats(raw: RawBeat[]): SpatialBeat[] {
  const totalHeight = raw.reduce((sum, b) => sum + b.heightVh, 0);
  let cursor = 0;
  return raw.map((b) => {
    const start = cursor / totalHeight;
    cursor += b.heightVh;
    const end = cursor / totalHeight;
    return { ...b, start, end };
  });
}

export const SPATIAL_BEATS: SpatialBeat[] = buildBeats(RAW_BEATS);

export const SPATIAL_TOTAL_HEIGHT_VH = RAW_BEATS.reduce((sum, b) => sum + b.heightVh, 0);

export function getBeatAtProgress(progress: number): SpatialBeat {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    SPATIAL_BEATS.find((b) => clamped >= b.start && clamped < b.end) ?? SPATIAL_BEATS[SPATIAL_BEATS.length - 1]
  );
}

export function getBeatProgress(beat: SpatialBeat, progress: number): number {
  const duration = beat.end - beat.start;
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, (progress - beat.start) / duration));
}

const assetWindowCache = new Map<string, { start: number; end: number }>();

/**
 * An asset's own active window (fraction of the whole sequence) — the
 * union of every beat that uses it. Mirrors cinematicManifest.ts's
 * getSlotWindow: Ken Burns runs continuously across that whole window
 * (e.g. Shopper Intent + Search sharing SHOPPER_SLOT) instead of
 * resetting per-beat.
 */
export function getAssetWindow(assetId: string): { start: number; end: number } {
  const cached = assetWindowCache.get(assetId);
  if (cached) return cached;
  let start = Infinity;
  let end = -Infinity;
  SPATIAL_BEATS.forEach((beat) => {
    if (beat.asset?.id === assetId) {
      start = Math.min(start, beat.start);
      end = Math.max(end, beat.end);
    }
  });
  const window = { start, end };
  assetWindowCache.set(assetId, window);
  return window;
}

/** Every unique asset slot across all beats, in first-appearance order. */
export function getUniqueAssetSlots(): SpatialAssetSlot[] {
  const seen = new Map<string, SpatialAssetSlot>();
  SPATIAL_BEATS.forEach((beat) => {
    if (beat.asset && !seen.has(beat.asset.id)) seen.set(beat.asset.id, beat.asset);
  });
  return Array.from(seen.values());
}
