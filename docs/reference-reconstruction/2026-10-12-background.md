# Background correction, 12 October 2026

## Before implementation

The browser connection is restored in this turn. Live About reference and local
before screenshots are saved in `D:/Portfolio Evidence/background-20261012/`.
The settled reference does NOT retain its loading construction lines. They were
visible during loading and disappeared; do not add them as permanent decoration.

The local interior background is a fixed 24px CSS grid, 180px cross pattern and
two radial gradients. The reference uses a square flat grid with 64 subdivisions
across the larger viewport dimension, crosses every eighth subdivision, animated
64x64 noise, fine grain, asymmetric edge attenuation, and pointer-driven light
and displacement. This affects About, Works, Writing, Services and Contact.

First factor: replace that interior backdrop using the measured reference layer
formulas. Preserve content, typography, layout, header, homepage and footer.
Rollback: `background-20261012/rollback/`. Use a small noise render target,
reuse the existing fluid implementation, suspend hidden/offscreen work, and
validate the background separately from authored foreground content. Reference
source: saved `reference-page.js`, SubPageBG, Grid, SubPageScene and compositor.
Validate the new renderer against an isolated original-shader fixture before
claiming a match. Then inspect actual page screenshots and test viewport,
reduced-motion, pointer and lifecycle behavior. Native all-frame and whole-site
acceptance stay open until their independent gates pass.

## Remaining background systems

This correction is for interior pages. The homepage dark chamber, panel seams,
LED dots, project color reflections, white chapters' two pointer regimes and
footer background each retain separate validation and correction work. Earlier
issues are not implicitly closed by this change.

## Retained implementation and evidence

Replaced the fixed CSS approximation with a dedicated WebGL background on
About, Works, Writing, Services, Contact and other studio-layout routes. The
measured reference formulas drive grid spacing, crosses, animated noise, grain,
edge attenuation and pointer light/displacement. Existing words and foreground
layout are unchanged by this factor. Small fixed noise/fluid targets are reused;
hidden/offscreen and page lifecycle suspension stop rendering. Reduced motion
freezes ambient drift while retaining direct input and the same visual field.

Precision mattered: the original scene target is unsigned-byte at 2/3 output
resolution, followed by a full-resolution half-float mixer. A fused compositor
candidate left thousands of one-level pixel errors and was rejected. At DPR 1.5,
rounding the output size before dividing by 1.5 also made the scene one pixel too
narrow; that candidate was rejected. Divide the unrounded dimensions instead.
All rejected evidence remains in the evidence directory.

Evidence root: `D:/Portfolio Evidence/background-20261012/`.

- `precision-matched`: six zero-input times, DPR 1; 12 images decoded/hashed.
  Maximum difference: one channel level, three pixels per pair.
- `sequence-dpr1`: 120 simulated chronological 1/120-second samples, 240 images
  decoded/hashed; maximum five differing pixels, one channel level; 13 exact
  pairs. This predates the fractional-DPR fix, which does not change DPR 1 math.
- `dpr15-fixed`: six final-candidate times, 12 images decoded/hashed; maximum
  four differing pixels, one channel level.
- `sequence-final-dpr15`: final full-build comparison at 1691x872 CSS pixels,
  DPR 1.5, times 10 through 10.991667; all 120 pairs/240 images decoded and
  SHA-256 hashed. Maximum six differing pixels per 2536x1308 image and one
  channel level; one pair is exactly identical. Each manifest records build,
  time, viewport and capture provenance. This is isolated original-renderer
  replay with zero pointer input, NOT native video or whole-page acceptance.
- Individually inspected the reference/local t=10 DPR-1.5 fixed pair, live before
  and after pages, five desktop route screenshots, 2560/390/320-width About,
  and reduced-motion pointer response. The 120-pair sequences were machine
  compared, not individually visually reviewed in full.
- `runtime-verified/report.json`: 12/12 checks pass: reduced-motion rest identity,
  ambient sleep, pointer response, suspension/resume, offscreen/reentry,
  context loss/restoration and three viewport sizes. Five routes each have one
  background canvas, no horizontal overflow and a visible Contact link.
- Isolated headless Edge D3D11 measurements: 240 rAF intervals, median 4.2 ms,
  p95/max 4.3 ms; 30 valid GPU queries, median 0.111616 ms, p95 0.113664 ms,
  max 0.11776 ms; CPU submission median 0.1 ms, p95 0.2 ms. These do not prove
  native display FPS, full-page CPU/VRAM cost or long-run stability.
- Final `npm run build` passes: 59 Astro files without diagnostic errors,
  warnings or hints; ESLint passes; 23 pages built, 21 Pagefind pages indexed.
  Vite retains its large-chunk advisory. Live final proof:
  `local-about-final-live.png` (normal browser, after final source build).

Decision: retain the correction because it removes the measured static-grid
mismatch and the isolated pixel errors are now bounded and recorded. Do not call
it 100% accepted: fast pointer equivalence, bloom during strong input, every
native frame, full-page pacing/memory and all other visual systems remain open.
Reduced-motion rendering currently continues advecting after pointer activity;
its eventual sleep needs a separate measured correction, not a premature cutoff.

## Homepage investigation, not yet a correction

The LED-dot shader already uses the reference density (1800 * 0.23 = 414) and
the same dot-mask strength. Changing density by eye would not fix the cause.
The chamber needs its own aligned comparison of geometry, panel subdivisions,
UV displacement, target precision, sampling and compositor output. Preserve
the protected identity geometry and project-driven color system while isolating
that work. Interior-background results cannot certify the homepage.

## Next isolated factor: homepage chamber sizing

Source comparison identifies a concrete coordinate mismatch. The reference Grid
and BGQuadTree size from base camera z=10 and base FOV=35+18/aspect. Local resize
sizes from the zoomed current camera (initial z=9.5 and fixed FOV=41 desktop).
The rendered camera later uses the reference formula, but chamber dimensions
remain based on the earlier different frustum. This changes apparent grid, dot
and panel size without any need to alter their shader density. Compare the
original reference grid with the actual local background factory at identical
camera/viewport states, then correct only the sizing calculation. Preserve
sculpture transform, panel colors, pattern transitions and protected GLB.
Rollback: `chamber-scale/background-before.ts`.

Sizing correction retained. `compare-chamber-scale.mjs` loads the original live
reference grid and the actual local background factory, with opaque black
backgrounds and identical camera states. Nine pairs cover 1691x872, 2560x1440,
1280x900, opening/pulled-back cameras and pointer parallax. All 18 after-images
are decoded/hashed and all nine pairs match exactly (zero differing pixels).
Before: up to 958,696 differing pixels, maximum channel difference 25. These are
isolated grid images with panels, crosses and compositor excluded, not full-site
or native-frame acceptance. Initial `before`/`after` fixture runs had different
clear alpha and are INVALID for color comparison; keep them as failed harness
evidence. Correct runs are `opaque-before` and `opaque-after`.

At 1691x872, chamber scale changed from 13.77585 to the reference 15.78108;
at 2560x1440, 12.62899 to 14.77305; at 1280x900, 10.10319 to 12.56218.
The correction changes only resize-time math, adding no draw calls or textures.
Final full build passes; protected GLB SHA-256 is unchanged. The normal browser
homepage was opened and captured in `chamber-scale/homepage-final-live.png`.

## Panel transform correction retained; exact parity remains open

Corrected the measured panel transform: inset/scale before rotation, exponential
out easing, thickness following the curved surface, and texture projection from
the unrotated tile. Projection now evaluates model-view then projection as in the
reference. Preserved the existing flat-outro path, identity and project assets.
Narrow rollback: `chamber-scale/background-before-panel.ts` (already contains the
accepted chamber-scale correction).

The fixture compares the original reference panel shaders against the actual
local factory using identical local geometry and a diagnostic gradient texture.
It excludes logos, pointer input, project images and the compositor. Therefore it
does not validate the reference's random subdivision sequence or full appearance.

- `panel-before`: nine pairs, up to 1,017,423 differing pixels, channel delta 69.
- `panel-after`: nine pairs after the principal correction, up to 4,827 pixels,
  channel delta 51. `panel-ordered`, `panel-projection` and `panel-dot` preserve
  the subsequent operation-order probes. Ordered curvature and dot arithmetic
  produced no measured improvement; sequential projection reduced the maximum
  differing-pixel count to 4,825. Do not portray these as exact matches.
- `panel-sequence`: final source, 120 evenly spaced transition phases from 0 to 1;
  240 images decoded and hashed. Worst 4,845 differing pixels per 1691x872 frame,
  maximum channel delta 56, zero exactly identical pairs. No page errors recorded.
  This is a parameter sweep, NOT a native-rate recording or time/pacing test.
- Individually reviewed the reference/local phase-0.375 pair from `panel-after`
  and frame 45 pair from `panel-sequence`; other sequence images were machine
  compared, not individually visually reviewed. Residual edge/quantization and
  overlap differences remain unresolved; material-depth behavior is still a
  candidate to isolate, not a proven cause.
- Final full build passes (59 Astro files, zero diagnostics; ESLint; 23 built
  pages and 21 indexed). Large-chunk advisory remains. Protected GLB SHA-256
  remains `04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
- Normal-browser final-build captures: `homepage-panel-final-live.png` opening,
  `homepage-works-final-live.png` Works title, `homepage-salty-final-live.png`
  second project. These show assembly, not frame-matched acceptance.

Retain this narrow correction because it removes the dominant geometric error
without new render targets, textures or draw calls. Native performance and every
frame acceptance remain open. Next work: resolve panel residuals, then compare
the full background compositor and both white pointer modes with aligned inputs.
Footer, interior page layouts, hover/controller behavior, project reflection and
full-site performance remain in the master backlog; none is certified by this pass.
