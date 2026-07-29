# Hinode production architecture

Status: Checkpoint 0 source boundary

## Rejected visual foundation

The current visible Hinode environment is rejected. Its roads, building and parcel placement,
flyover, footpaths, vegetation placement, billboard placement, visible props, generated coupe and
provisional full-city coordinates are not approved art or spatial design. They must not be repaired,
extended or treated as the foundation of the replacement city.

Excluded files remain uncommitted and untouched until a later checkpoint explicitly classifies or
removes them. Stale renders, screenshots, Blender sources and generated GLBs are not approval
evidence.

## Retained non-visual preparation

Reusable Astro and Three.js runtime infrastructure, input and camera behaviour, tests, validation
tools, asset-audit tools, catalogue records, neon research, and non-spatial sign and socket research
may continue when they do not depend on rejected placement.

Technical validation proves only the behaviour it measures. It does not establish visual approval.

## Authoritative production flow

1. Audit the supplied read-only asset library.
2. Build the development-only browser level editor.
3. Design and validate the complete road-first city layout in the editor.
4. Stop for user approval of the complete map.
5. Produce clean modular assets in Blender.
6. Place approved assets through the editor.
7. Reconstruct approved districts in Blender for lighting and texture baking.
8. Export optimised district GLBs and load them into the Three.js runtime.

The browser editor owns city placement and saves the authoritative JSON. Blender may consume that
approved JSON, but it may not independently generate or rearrange the complete city.

## Decisions still pending

- Map scale: Option B, approximately 700 by 500 metres, is provisional only.
- Hero car: the Skyline R32 is a provisional candidate only.
- Asset permissions and attribution: pending the complete asset audit.

No candidate asset may be integrated until its permission and attribution requirements are
confirmed. The audit must inspect separate licence files, embedded glTF and GLB metadata, Blender
text blocks, custom properties, asset metadata, and available original source-page information.
