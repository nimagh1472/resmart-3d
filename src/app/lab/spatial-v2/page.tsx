import { SpatialStage } from '@/components/spatial/SpatialStage';

/**
 * Isolated QA route for Spatial V2 — NOT linked from the live site's
 * navigation, matching this repo's existing isolation convention (see
 * the archived /lab/cinematic-slice and /lab/cinematic-hero). Not wired
 * into the production homepage yet.
 */
export default function SpatialV2Page() {
  return <SpatialStage />;
}
