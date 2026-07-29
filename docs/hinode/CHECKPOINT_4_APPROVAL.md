# Hinode City Checkpoint 4 approval record

## Delivered proposal

- Map: `HINODE_CITY_OPTION_A_V1`, exactly 500 × 350 metres
- Network: nine named routes, approximately 3,303.2 metres across all authored cubic Bézier splines
- Lap design: six route gates, target window 150–240 seconds
- Infrastructure: flyover, harbour underpass and two shortcuts
- Road edge: footpath and drainage plans on all nine routes
- Planning: 15 parcels, seven vegetation zones and nine sign zones
- Collision: four Rapier map-boundary volumes
- Review: five district poses plus flyover and underpass poses, each with driver and chase cameras

## Vehicle and handling

Runtime identity: **MAH Nightline**
Asset ID: `VEH_MAH_Nightline_R34_Derivative`

The derivative preserves the source silhouette, has four wheel pivots, lamp states, fictional
badges, simple collider metadata and three LODs: 11,988, 7,452 and 3,645 triangles.

The browser handling model uses a 120 Hz fixed Rapier rigid body, separate longitudinal/lateral tyre
forces, speed-sensitive steering, progressive throttle/brake, handbrake rear-grip reduction,
collision recovery and keyboard/gamepad input.

## Evidence

The live package at `/play/hinode-progress/` verifies 37 files:

- seven current browser overview/gameplay screenshots;
- seven planning overlays;
- 14 district/feature driver and chase views;
- three browser-recorded videos;
- six MAH Nightline review renders.

All browser screenshots and videos come from the served Three.js runtime or editor. No Blender
animation is used as gameplay evidence.

## Known limits

- building and skyline geometry is proxy massing;
- vegetation remains zone-only pending full rights review;
- sign zones are not final billboard art;
- environment materials and lighting need a dedicated art pass;
- handling feel still requires human review;
- Low's requested GPU-cost reduction needs an RTX 3070 benchmark;
- automated Chrome capture does not replace manual play;
- only outer map-boundary collision volumes are authored at this checkpoint.

Recommended next production district after approval: **Alley District**, because it exercises the
narrowest road, storefront rhythm, canal edge, shortcut and the strongest Hinode identity without
requiring final whole-city production.
