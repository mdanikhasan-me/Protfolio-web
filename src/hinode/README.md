# Hinode browser runtime

This is the isolated clean-room Hinode implementation. Modules may depend on general framework
infrastructure and Three.js, but may not import a rejected game module or rejected public asset.

## Current production boundary

The current visible Hinode environment is rejected. Its road placement, parcels, buildings,
flyover, vegetation placement, billboard placement, prop placement, generated coupe and full-city
coordinates are not an approved foundation for the next city.

Reusable runtime infrastructure may be retained when it remains independent of those placements:

- Astro route integration;
- Three.js scene loading and rendering;
- input handling and the fixed-step update loop;
- pause, reset and arcade-driving behaviour;
- road-height chase-camera behaviour;
- unit, browser and validation infrastructure.

Technical validation of retained infrastructure is not visual approval of the rejected environment.

## Authoritative layout

The development-only browser level editor will become the authoritative city-layout tool. It will
save structured layout JSON covering roads, districts, parcels, zones, sockets, clearances,
collisions and route checkpoints. Three.js will load that exact layout for play and review.

Blender is an asset-production, baking and export tool. It may reconstruct an approved editor layout
for district baking, but it may not independently invent the city placement or generate the complete
city as one master scene.

## Asset and licence boundary

The supplied asset library remains read-only. Project-local derivatives require documented
provenance. Licence and attribution status remains pending the complete asset audit, including
embedded glTF metadata, Blender text blocks and custom properties, and original source-page
information where available.

No asset may enter the runtime until its permission and attribution requirements are confirmed.
Buildings are exterior shells only; no accessible or modelled interiors are permitted.
