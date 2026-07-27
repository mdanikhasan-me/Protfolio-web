# Constraint Field technical feasibility

Every number below is an **unmeasured Checkpoint 2 estimate**, not measured performance. The future
Play route would be separately loaded and separately budgeted.

| Estimate area                             | Checkpoint 2 estimate                                               | Production intent / constraint                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Normal-page JavaScript                 | **45–70 kB compressed**                                             | Astro navigation, field-state id, selection/focus, lazy controller                                      |
| 2. Visual-enhancement JavaScript          | **95–155 kB compressed**                                            | Batched field renderer, deterministic constraint interpolation, no physics engine                       |
| 3. Number of models                       | **0 required; 1 procedural mark mesh in memory**                    | One instanced primitive, generated at runtime                                                           |
| 4. Estimated compressed GLB sizes         | **0 kB**                                                            | No shipped GLB; Blender study is not production media                                                   |
| 5. Texture count                          | **0–3 plus visible project media**                                  | Optional tiny normal, noise lookup, and gradient lookup                                                 |
| 6. Texture format                         | **KTX2/Basis for optional GPU maps; AVIF/WebP for evidence**        | SVG/Canvas tiers need no GPU texture                                                                    |
| 7. Expected draw calls                    | **2–6 active**                                                      | One instanced mark batch, optional memory trace, optional active media edge                             |
| 8. Shader count                           | **1 custom field shader plus 0–1 simple edge shader**               | Opaque marks; no particle transparency stack                                                            |
| 9. Continuous-rendering regions           | **0.2–0.9 s constraint transitions; optional small pointer radius** | Pointer response disabled by default on touch and reduced motion                                        |
| 10. Static-rendering regions              | **All settled chapters, case body, Stories, Contact**               | Renderer sleeps after threshold; SVG tier is fully static                                               |
| 11. Mobile simplification                 | **60–120 marks, SVG/Canvas 2D, one vertical current**               | Precomputed field states; no 3D lighting                                                                |
| 12. Route-level loading                   | **Field enhancement on home/work shell only**                       | Case pages keep a sparse static edge; Play has its own future bundle                                    |
| 13. Fallback strategy                     | **Semantic HTML → deterministic SVG field → static SVG snapshot**   | Navigation never depends on simulation                                                                  |
| 14. Approximate implementation difficulty | **High: 8/10**                                                      | Authoring fields that feel intentional, deterministic transition targets, and mobile tiers require care |

## Performance gates before production

- One batched draw path on desktop and no per-mark DOM nodes.
- Stable fields must be precomputed or deterministic; no indefinite simulation.
- Content corridors must remain clear at every responsive breakpoint, not only at 1920 × 1080.
- Renderer sleeps after every state settles and when offscreen.
- Mobile, reduced-motion, and no-WebGL assets are accepted alongside the rich tier, not added later.
- Project colour propagation uses approved build-time tokens.

## Blender boundary

The deterministic Blender render tests close-up density and grazing light. Heavy output remains
under `.local-validation/blender/`; only the reproducible script is committed. Production should use
instancing or SVG, not ship the `.blend`.
