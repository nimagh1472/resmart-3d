/**
 * Single source of truth for the authored-imagery cinematic hero (the
 * "Cinematic Pivot" — see src/components/three/ARCHIVED.md for what this
 * replaces and why). Every scene's timing and every piece of media the
 * design team needs to supply is declared here — nothing is hard-coded
 * inline in a component, matching this repo's existing convention
 * (pitchData.ts) of centralizing the figures/assets components consume.
 *
 * The 7 approved assets (public/assets/cinematic/) are fully-composed
 * marketing renders — Dubai skyline + vehicle/UI/branding baked into a
 * single frame — not decomposable background/hero/midground plates. So
 * each scene gets ONE MediaSlot (occasionally reused across 2 consecutive
 * scenes, e.g. the network shot spanning Scenes 07-08) rather than the
 * layered composition an unbaked photo plate would allow. Cinematic motion
 * comes from a per-slot Ken Burns pan/zoom driven by the slot's own active
 * time window (see getSlotWindow) plus MediaLayer's pointer parallax — not
 * from swapping images, which is what would make it read as a slideshow.
 */

export type DepthLayer = 'background' | 'midground' | 'hero' | 'foreground' | 'effects';

export interface KenBurns {
  zoomFrom: number;
  zoomTo: number;
  /** Percent-of-frame pan offsets — deliberately small (cinematic, not a music-video whip pan). */
  panXFrom: number;
  panXTo: number;
  panYFrom: number;
  panYTo: number;
}

export interface MediaSlot {
  /** Stable key — also the asset filename stem under public/assets/cinematic/. */
  id: string;
  layer: DepthLayer;
  kind: 'image' | 'video';
  recommendedDimensions: string;
  recommendedFormat: string;
  optional?: boolean;
  note?: string;
  kenBurns: KenBurns;
}

export interface SceneDefinition {
  index: number;
  key: string;
  name: string;
  /** Seconds, matching the Cinematic Pivot directive's ~25–30s total runtime. */
  start: number;
  end: number;
  media: MediaSlot[];
  soundCueId?: string;
  emotionalObjective: string;
}

export const TOTAL_DURATION_SECONDS = 30;

export const DUBAI_ESTABLISHING_SHOT: MediaSlot = {
  id: 'dubai-establishing',
  layer: 'background',
  kind: 'image',
  recommendedDimensions: '1672x941',
  recommendedFormat: 'PNG (approved)',
  note: 'Clean night establishing shot, Burj Khalifa + Dubai Fountain + Dubai Mall unmistakable. Scene 02.',
  kenBurns: { zoomFrom: 1.0, zoomTo: 1.16, panXFrom: 0, panXTo: -2, panYFrom: 0, panYTo: -1.5 },
};

export const VEHICLE_HERO: MediaSlot = {
  id: 'resmart-vehicle',
  layer: 'hero',
  kind: 'image',
  recommendedDimensions: '1672x941',
  recommendedFormat: 'PNG (approved)',
  note: 'ReSmart autonomous vehicle, Downtown Dubai promenade, Burj Khalifa background. Scene 03.',
  kenBurns: { zoomFrom: 1.08, zoomTo: 1.0, panXFrom: 3, panXTo: 0, panYFrom: 0, panYTo: 0 },
};

export const SHOPPER_INTENT_SHOT: MediaSlot = {
  id: 'shopper-intent',
  layer: 'hero',
  kind: 'image',
  recommendedDimensions: '1672x941',
  recommendedFormat: 'PNG (approved)',
  note: 'Shopper with phone, AI search halo (search/deals/cashback/vouchers/nearby). Scene 04.',
  kenBurns: { zoomFrom: 1.0, zoomTo: 1.1, panXFrom: -1.5, panXTo: 0, panYFrom: 0, panYTo: 0 },
};

export const MERCHANT_ACTIVATION_SHOT: MediaSlot = {
  id: 'merchant-activation',
  layer: 'hero',
  kind: 'image',
  recommendedDimensions: '1672x941',
  recommendedFormat: 'PNG (approved)',
  note: 'ReSmart storefront, merchant dashboard + "Merchant Activated", Burj Khalifa background. Scene 05.',
  kenBurns: { zoomFrom: 1.0, zoomTo: 1.12, panXFrom: 1, panXTo: 0, panYFrom: 0, panYTo: -1 },
};

export const DELIVERY_ROUTE_SHOT: MediaSlot = {
  id: 'delivery-route',
  layer: 'hero',
  kind: 'image',
  recommendedDimensions: '1672x941',
  recommendedFormat: 'PNG (approved)',
  note: 'ReSmart vehicle in motion, AR route line + waypoint + parcel hologram. Scene 06.',
  kenBurns: { zoomFrom: 1.0, zoomTo: 1.14, panXFrom: 0, panXTo: -2.5, panYFrom: 0, panYTo: 0 },
};

export const LIVING_NETWORK_SHOT: MediaSlot = {
  id: 'living-ai-network',
  layer: 'background',
  kind: 'image',
  recommendedDimensions: '1672x941',
  recommendedFormat: 'PNG (approved)',
  note: 'Aerial Downtown Dubai, Living AI Network graph fanning from Burj Khalifa. Scenes 07-08.',
  kenBurns: { zoomFrom: 1.0, zoomTo: 1.28, panXFrom: 0, panXTo: 0, panYFrom: 0.5, panYTo: -1.5 },
};

export const BRAND_MARK_SHOT: MediaSlot = {
  id: 'brand-mark',
  layer: 'hero',
  kind: 'image',
  recommendedDimensions: '1672x941',
  recommendedFormat: 'PNG (approved)',
  note: 'Glowing ReSmart mark over dark water, reflection, negative space for wordmark. Scenes 09-10.',
  kenBurns: { zoomFrom: 1.05, zoomTo: 1.0, panXFrom: 0, panXTo: 0, panYFrom: 0.5, panYTo: 0 },
};

export const SCENES: SceneDefinition[] = [
  {
    index: 1,
    key: 'black',
    name: 'Black',
    start: 0,
    end: 2.5,
    media: [],
    soundCueId: 'ambience',
    emotionalObjective: 'Anticipation — a held breath, no logo, no explanation.',
  },
  {
    index: 2,
    key: 'dubai-reveal',
    name: 'Dubai Reveal',
    start: 2.5,
    end: 7,
    media: [DUBAI_ESTABLISHING_SHOT],
    soundCueId: 'score',
    emotionalObjective: 'Awe — Burj Khalifa unmistakable, luxury-automotive-commercial pacing.',
  },
  {
    index: 3,
    key: 'vehicle',
    name: 'ReSmart Vehicle',
    start: 7,
    end: 11,
    media: [VEHICLE_HERO],
    soundCueId: 'vehicle',
    emotionalObjective: 'Grounding — the abstract city gets a plausible, premium protagonist.',
  },
  {
    index: 4,
    key: 'shopper-intent',
    name: 'Shopper Intent',
    start: 11,
    end: 14,
    media: [SHOPPER_INTENT_SHOT],
    soundCueId: 'shopper-cue',
    emotionalObjective: '"Dubai just heard what you need" — AI search halo, restrained.',
  },
  {
    index: 5,
    key: 'merchant-activation',
    name: 'Merchant Activation',
    start: 14,
    end: 17,
    media: [MERCHANT_ACTIVATION_SHOT],
    soundCueId: 'merchant-cue',
    emotionalObjective: 'Recognition — one specific building responds, gold accent.',
  },
  {
    index: 6,
    key: 'delivery',
    name: 'Delivery',
    start: 17,
    end: 20,
    media: [DELIVERY_ROUTE_SHOT],
    soundCueId: 'delivery',
    emotionalObjective: 'Momentum — a thin, elegant route connects shopper, merchant, delivery.',
  },
  {
    index: 7,
    key: 'living-network',
    name: 'Living AI Network',
    start: 20,
    end: 23,
    media: [LIVING_NETWORK_SHOT],
    soundCueId: 'network-climax',
    emotionalObjective: 'Scale — the whole network fanning from Downtown, elegant not cyberpunk.',
  },
  {
    index: 8,
    key: 'climax',
    name: 'Climax',
    start: 23,
    end: 25,
    media: [LIVING_NETWORK_SHOT],
    soundCueId: 'network-climax',
    emotionalObjective: 'Peak — the primary screen-record/share moment.',
  },
  {
    index: 9,
    key: 'silence',
    name: 'Silence',
    start: 25,
    end: 26,
    media: [BRAND_MARK_SHOT],
    soundCueId: 'silence',
    emotionalObjective: 'Reset — a breath after the peak, cut to just the mark.',
  },
  {
    index: 10,
    key: 'brand-reveal',
    name: 'Brand Reveal',
    start: 26,
    end: 30,
    media: [BRAND_MARK_SHOT],
    soundCueId: 'sting',
    emotionalObjective: '"THIS IS RESMART." — minimal typography, no visual clutter.',
  },
];

export function getSceneAtTime(seconds: number): SceneDefinition {
  const clamped = Math.max(0, seconds);
  return SCENES.find((scene) => clamped >= scene.start && clamped < scene.end) ?? SCENES[SCENES.length - 1];
}

export function getSceneProgress(scene: SceneDefinition, seconds: number): number {
  const duration = scene.end - scene.start;
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, (seconds - scene.start) / duration));
}

const slotWindowCache = new Map<string, { start: number; end: number }>();

/**
 * A slot's own active time window — the union of every scene that uses it.
 * Ken Burns runs continuously across that whole window (e.g. Scenes 07+08
 * sharing the network shot) instead of resetting per-scene, so a slot
 * spanning multiple scenes drifts smoothly through the crossfade rather
 * than jump-cutting its zoom/pan back to the start.
 */
export function getSlotWindow(slotId: string): { start: number; end: number } {
  const cached = slotWindowCache.get(slotId);
  if (cached) return cached;
  let start = Infinity;
  let end = -Infinity;
  SCENES.forEach((scene) => {
    if (scene.media.some((slot) => slot.id === slotId)) {
      start = Math.min(start, scene.start);
      end = Math.max(end, scene.end);
    }
  });
  const window = { start, end };
  slotWindowCache.set(slotId, window);
  return window;
}
