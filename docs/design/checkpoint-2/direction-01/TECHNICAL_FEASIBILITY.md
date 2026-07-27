# Signal Weave technical feasibility

Every number below is an **unmeasured Checkpoint 2 estimate**, not a benchmark or implementation
result. Budgets apply to the normal portfolio; a future Play route would have its own isolated
budget.

| Estimate area                             | Checkpoint 2 estimate                                                   | Production intent / constraint                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1. Normal-page JavaScript                 | **45–75 kB compressed**                                                 | Astro navigation, focus state, lazy transition controller; no Three.js in the base path |
| 2. Visual-enhancement JavaScript          | **110–170 kB compressed**                                               | Lazy route chunk for curve rendering and short transition state; load after content     |
| 3. Number of models                       | **0 required; 1 optional procedural study**                             | Prefer generated tubes from four splines rather than an authored model                  |
| 4. Estimated compressed GLB sizes         | **0 kB preferred; 180–320 kB maximum optional**                         | Only if close-view junction detail cannot be generated efficiently                      |
| 5. Texture count                          | **0–3**                                                                 | One tiny grain/normal, one optional lookup, one approved active project image           |
| 6. Texture format                         | **KTX2/Basis for GPU; AVIF/WebP for evidence**                          | Responsive DOM image remains separate from the visual layer where possible              |
| 7. Expected draw calls                    | **8–18 active; 0 canvas calls when static SVG tier is used**            | Four opaque strands, limited junction accents, no per-segment objects                   |
| 8. Shader count                           | **1–2 custom plus basic image material**                                | Matte mineral surface and optional junction light; no refractive stack                  |
| 9. Continuous-rendering regions           | **None by default; 0.2–0.8 s bursts around state change**               | Render-on-demand stops after damping threshold                                          |
| 10. Static-rendering regions              | **Stories, Contact, case-study body, mobile fallback**                  | SVG/CSS persists with no frame loop                                                     |
| 11. Mobile simplification                 | **2–3 SVG strands, 80–140 path points total**                           | No 3D close view, lower crossing count, HTML controls above SVG                         |
| 12. Route-level loading                   | **Rich renderer only on home/work transition shell**                    | Project pages load a static progress strand; Play remains a separate bundle             |
| 13. Fallback strategy                     | **Semantic HTML → inline SVG → static PNG only as final defensive art** | Full navigation and evidence work without the enhancement                               |
| 14. Approximate implementation difficulty | **High: 7.5/10**                                                        | Route-continuity geometry and responsive curve authoring are the hard parts             |

## Performance gates before production

- Text must reach LCP without waiting for visual enhancement.
- Four-strand desktop scene must stay within the draw-call and burst-duration estimates on the
  agreed baseline hardware.
- `prefers-reduced-motion` and no-WebGL states must be visually complete before motion tuning.
- Returning from a case study must restore selection and focus without refetching or a running loop.
- Approved project-image colour metadata should be computed at build time, not sampled every visit.

## Blender boundary

The reproducible Blender study tests close-view material and occlusion only. Its `.blend` and PNG
remain ignored in `.local-validation/blender/`; the committed source is
`tools/blender/checkpoint2_system_studies.py`.
