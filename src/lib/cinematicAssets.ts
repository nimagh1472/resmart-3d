/**
 * Resolved media URLs, keyed by MediaSlot.id (see cinematicManifest.ts).
 * The 7 approved renders live in public/assets/cinematic/ — MediaLayer.tsx
 * falls back to PlaceholderMedia for any slot missing here, so this stays
 * the single place a new/replacement asset needs wiring.
 */
export const CINEMATIC_ASSETS: Partial<Record<string, string>> = {
  'dubai-establishing': '/assets/cinematic/dubai-establishing.png',
  'resmart-vehicle': '/assets/cinematic/resmart-vehicle.png',
  'shopper-intent': '/assets/cinematic/shopper-intent.png',
  'merchant-activation': '/assets/cinematic/merchant-activation.png',
  'delivery-route': '/assets/cinematic/delivery-route.png',
  'living-ai-network': '/assets/cinematic/living-ai-network.png',
  'brand-mark': '/assets/cinematic/brand-mark.png',
};
