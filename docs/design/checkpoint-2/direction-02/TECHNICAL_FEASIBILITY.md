# Kinetic Ledger technical feasibility

Every number below is an **unmeasured Checkpoint 2 estimate**, not a measured bundle result or
runtime benchmark.

| Estimate area                             | Checkpoint 2 estimate                                               | Production intent / constraint                                                         |
| ----------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1. Normal-page JavaScript                 | **35–55 kB compressed**                                             | Astro navigation, selection, optional View Transition state                            |
| 2. Visual-enhancement JavaScript          | **20–45 kB compressed**                                             | Local seam controller and decorative glyph deformation; no 3D library                  |
| 3. Number of models                       | **0**                                                               | A model would add cost without serving the typographic law                             |
| 4. Estimated compressed GLB sizes         | **0 kB**                                                            | No GLB planned                                                                         |
| 5. Texture count                          | **0–2 plus visible project media**                                  | Optional small paper grain and optional precomputed displacement lookup                |
| 6. Texture format                         | **CSS/SVG first; AVIF/WebP for evidence**                           | Avoid raster type; grain can be CSS or tiny WebP                                       |
| 7. Expected draw calls                    | **0 WebGL; 1 Canvas 2D layer or SVG paths**                         | Core visual is DOM/CSS                                                                 |
| 8. Shader count                           | **0**                                                               | Canvas/SVG deformation is sufficient; CSS filters tightly limited                      |
| 9. Continuous-rendering regions           | **Only while seam intersects a display word, ~0.1–0.5 s**           | RAF stops on recovery and is disabled for reduced motion                               |
| 10. Static-rendering regions              | **All body content, Services, Stories, Contact, settled bands**     | Normal layout remains fully static                                                     |
| 11. Mobile simplification                 | **Two-row display locks; deformation limited to ~2 glyphs**         | No Canvas required on low-tier mobile                                                  |
| 12. Route-level loading                   | **Optional deformation chunk on home/work index only**              | Case studies and Contact need no effect code; Play remains isolated                    |
| 13. Fallback strategy                     | **Semantic HTML/CSS is the primary design; SVG/Canvas is additive** | Removing enhancement does not remove the concept                                       |
| 14. Approximate implementation difficulty | **Medium: 5.5/10**                                                  | Text metrics, visual/semantic layer alignment, and browser behavior are the main risks |

## Performance gates before production

- A single semantic heading must remain the accessible source; visual glyph layers are hidden from
  assistive technology.
- Deformation must never force layout on every scroll frame.
- Fallback font and loaded font need compatible authored line breaks.
- 200% zoom, forced colours, reduced motion, keyboard navigation, and long project names must use a
  settled readable state.
- Project palette transfer uses stored approved colour tokens rather than client-side image scans.

## Blender boundary

Blender is deliberately unnecessary. A DOM/SVG proof with real font shaping is the correct
feasibility test.
