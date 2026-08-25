/**
 * Resolved desktop/mobile URLs for Spatial V2, keyed by asset id (see
 * spatialManifest.ts). Points at the optimized WebP derivatives, NOT the
 * original PNGs in public/assets/spatial-v2/ — the originals are kept
 * as-authored masters; these are what the isolated /lab/spatial-v2 route
 * actually transfers (≈3.7MB combined vs ≈40.5MB for the 18 PNGs).
 */
export interface SpatialAssetUrls {
  desktop: string;
  mobile: string;
}

const BASE = '/assets/spatial-v2/optimized';

export const SPATIAL_ASSETS: Record<string, SpatialAssetUrls> = {
  dubai: { desktop: `${BASE}/01-dubai-desktop.webp`, mobile: `${BASE}/01-dubai-mobile.webp` },
  shopper: { desktop: `${BASE}/02-shopper-desktop.webp`, mobile: `${BASE}/02-shopper-mobile.webp` },
  merchant: { desktop: `${BASE}/03-merchant-desktop.webp`, mobile: `${BASE}/03-merchant-mobile.webp` },
  transaction: { desktop: `${BASE}/04-transaction-desktop.webp`, mobile: `${BASE}/04-transaction-mobile.webp` },
  chase: { desktop: `${BASE}/05-chase-desktop.webp`, mobile: `${BASE}/05-chase-mobile.webp` },
  delivery: { desktop: `${BASE}/06-delivery-desktop.webp`, mobile: `${BASE}/06-delivery-mobile.webp` },
  pullback: { desktop: `${BASE}/07-pullback-desktop.webp`, mobile: `${BASE}/07-pullback-mobile.webp` },
  network: { desktop: `${BASE}/08-network-desktop.webp`, mobile: `${BASE}/08-network-mobile.webp` },
  signature: { desktop: `${BASE}/09-signature-desktop.webp`, mobile: `${BASE}/09-signature-mobile.webp` },
};
