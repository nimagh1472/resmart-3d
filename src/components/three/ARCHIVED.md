# Archived — Real-Time 3D Dubai Prototype

**Status: archived, not deleted.** This directory (and the corresponding
routes under `src/app/lab/asset-inspector`, `src/app/lab/cinematic-slice`,
`src/app/lab/raw-loader-test`) is no longer the production path for the
pre-launch hero experience. That role now belongs to the authored-imagery
cinematic architecture in `src/components/cinematic/`.

## Why

The business objective is an ultra-premium interactive cinematic *product
film* for first-time visitors, not a real-time-rendered 3D city. Authored
hero imagery + lightweight parallax/DOM/CSS effects gets there faster, more
reliably, and at a fraction of the performance cost — see the Phase 04A work
in this same directory's git history for the concrete evidence that drove
this call (a rigorous, multi-session diagnostic effort: one of two licensed
hero GLB assets never completed loading through Three.js's GLTFLoader under
any tested configuration; the one that did load required extensive manual
material repair to read as more than a dark silhouette; total time
investment was large relative to the visual payoff).

## What's here and why it's kept

- `CinematicSlice.tsx`, `SceneTimeline.tsx`, `DubaiEnvironment.tsx`,
  `NightSky.tsx`, `StreetLighting.tsx`, `HeroLandmarks.tsx`,
  `MissingAssetBoundary.tsx`, `AssetInspector.tsx` — a working, isolated
  (never wired into the production site) R3F pipeline: scripted camera
  timeline with a QA time-override mechanism, a procedural
  geographically-neutral night sky, real Poly Haven CC0 ground materials,
  and an explicit missing/broken-asset reporting pattern (no primitive
  substitutes, ever). All still type-check and build.
- `public/assets/3d/` (HDRI + PBR textures, CC0) and
  `public/assets/3d-source/burj-khalifa.glb` (CC-BY 4.0, licensed, real
  267K-triangle Burj Khalifa geometry, genuinely loads) — kept as real,
  usable, licensed assets for whatever this becomes next.
- `public/assets/3d-source/dubai_skyscraper.glb` — kept for the record, but
  confirmed broken (never completes GLTFLoader parsing, under dev/prod,
  GPU/no-GPU, single/double load, up to 90s wait, on both drei's pipeline
  and a raw independent GLTFLoader instance). Don't re-attempt without
  re-exporting the source file first.

## Possible future use

Interactive demos, investor-facing product walkthroughs, or a future
campaign — anything where real-time 3D interactivity is the actual point,
rather than a means to a cinematic first impression. Not deleted for exactly
that reason.
