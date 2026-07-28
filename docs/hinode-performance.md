# Hinode City vertical-slice performance contract

## Hard targets

| Metric | Vertical-slice target |
| --- | ---: |
| Compressed public Hinode payload | below approximately 12 MB |
| Normal visible triangles | below approximately 180,000 |
| Normal draw calls | below approximately 150 |
| Default-mode frame rate | smooth 60 FPS on the RTX 3070 development system |
| Routine texture edge | 512 or 1024 pixels |
| Exceptional texture edge | 2048 pixels only with written justification |
| Dynamic lights | very few |

Repeated props use instancing where practical. Collision is simple and independent of render detail.
The environment uses shared materials and a baked static-light/AO atlas. The real-time renderer uses
only restrained ambient/moon lighting and the vehicle lights required by the composition.

## Quality hooks

The runtime exposes high, medium, and low configuration hooks for pixel ratio, shadow quality,
decorative density, and reflections. Only the default mode is tuned in this checkpoint.

## Measurements

Final evidence records:

- raw and gzip bytes for every public Hinode asset and generated script chunk;
- renderer draw calls, triangles, textures, and geometries during representative driving;
- sampled browser FPS and frame time;
- Blender mesh and material counts;
- the exact test browser, viewport, quality setting, and commit.

The existing portfolio build and any old Three.js warning are not Hinode performance evidence. Only
the clean preview route and newly generated assets count.

