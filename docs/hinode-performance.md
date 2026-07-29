# Hinode City performance contract

## Public profiles

Hinode exposes exactly **High** and **Low**.

High is the primary artistic profile. Low preserves the same route and composition while reducing
pixel ratio, shadow work and district-proxy density.

## Checkpoint 4 automated Chrome sample

The values below come from the current installed-Chrome capture at 1440 × 900. They are diagnostic
browser values, not an RTX 3070 GPU benchmark.

| Metric                |             High city |              Low city |
| --------------------- | --------------------: | --------------------: |
| Fixed physics         |                120 Hz |                120 Hz |
| Draw calls            |                    80 |                    64 |
| Visible triangles     |                22,444 |                15,700 |
| Capture speed         |               38 km/h |               38 km/h |
| Reported headless FPS | 180 (capture ceiling) | 180 (capture ceiling) |

Low reduced visible triangles by about 30% and draw calls by 20% in this capture. The requested 35%
GPU-frame-cost reduction is not proven because headless Chrome reached the capture ceiling in both
profiles. A manual RTX 3070 GPU/frame-time and VRAM benchmark remains required.

The current MAH Nightline GLBs are measured by `npm run review:hinode`; raw and gzip totals are
written to `public/hinode/review/status.json`. Runtime bundle measurements are recorded by the
production build rather than inferred from source.

## Guardrails

- normal gameplay draw calls remain below 150 in the current proposal;
- collision geometry is independent of render detail;
- the player car uses LOD0 during normal gameplay;
- LOD1 and LOD2 are available for distant/editor use;
- unresolved vegetation models are not shipped;
- decorative assets must not block initial driving.
