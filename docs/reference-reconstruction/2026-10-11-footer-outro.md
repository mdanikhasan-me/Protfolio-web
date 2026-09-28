# Footer outro: structural correction, October 11

**User rejection after the first local candidate:** the vertical-line animation
was explicitly rejected as not close to the reference. The 50 functional checks
below did not test reference motion fidelity. See the measured vertical-line
correction in [the next pass](2026-10-11-footer-vertical-lines.md). Its reference
track analysis supersedes this report's earlier claim that verticals converge
sideways. Do not treat the first candidate as visually accepted.

The user again rejected the footer. This pass prioritizes V16 without closing the
whole-site audit. The previous short construction-line reveal was built around
the wrong layout. Do not restore it as the reference model.

## Reference findings

Inspected the current public reference, https://alche.studio/, its outro
controller, CSS and `top/outro/data.json`. These are supplemental live-reference
observations; they do not replace the historical native corpus.

- The homepage has a **200vh outro wrapper**, a **100vh sticky screen**, and the
  link footer positioned at the bottom of that wrapper. There is no second huge
  logo below those links on the homepage. Inner pages use a static footer logo.
- Its solid A begins at the screen center, width 20.4%. After 300px of the outro
  enters the viewport, it moves to left 17.1% over one second, power2.inOut.
- The drawing starts 100ms later. Its authored timeline is 119 frames at
  29.970001 fps, approximately 3.97 seconds. This is **asset timing**, not native
  display capture or a measured runtime frame rate.
- Full-height vertical guides move into place; horizontal and diagonal guides
  precede letter outlines. Fill opacity rises between frames 57 and 79. This is
  not the old bottom-up wipe. Guides disappear after construction.
- Mobile uses a 1.7 aspect-ratio stage instead of the long pinned desktop scroll.
- The reference includes a subtle changing colored field behind the letters.

Six isolated-browser reference screenshots were captured with recorded sequential
waits. Four were individually reviewed: guides, outlines, settled logo and bottom
links. They are samples, not an all-frame review. A reference sound prompt overlays
the bottom of these captures; exclude it from comparison to our authored footer.

## Implementation and narrow rollback

Evidence root: `D:\Portfolio Evidence\current-20261011\footer-reference-match`.
Before-source copies: `SiteFooter.astro`, `studio-footer.css` in that directory.
Earlier rendered before evidence remains in the October 9/10 footer directories
and the October 11 whole-site audit. No reference assets were added to production.

This is one bounded correction to the footer's sequence and layout:

- `FooterBrand.astro` retains all four authored glyph paths. The home outro spaces
  those paths across a 1000-unit viewBox, preserving the A's approximately 20.4vw
  width and the reference's 6.9% outer margin. Inner pages retain original spacing.
- The homepage now has a pinned outro, centered-A entrance, guide convergence,
  outline drawing, opacity fill, then completed logo above the links. The guides
  paint behind the solid letters. No second WebGL context or animation dependency.
- Footer navigation remains semantic and every existing word/link is retained.
  The fixed home header/section rail clear the outro and return on reverse scroll.
  The header remains reachable when keyboard focus is inside it.
- Trigger state resets only on returning above the entrance, not on continuing
  down to the links. Measurements run on layout/viewport changes. Scroll updates
  are event-driven; no permanent footer animation loop is installed. History
  lifecycle handlers disconnect and reconnect observers/listeners.
- Reduced motion retains the final layout and faint, stationary construction
  guides, with a 200ms opacity reveal instead of sideways travel.
- Short desktop viewports move the logo up to clear the links; mobile uses the
  compact stage and document-flow links. No layout or text changes outside this
  component are part of this correction.

Rollback only this chunk: restore the two before-source copies and remove the new
`FooterBrand.astro` / `footer-outro.ts`. Preserve the unrelated hidden-WebGL and
mobile breadcrumb changes already in the working tree.

## Validation and remaining gates

Final build, rendered diagnostic and idle-work results are recorded below.
Test tooling is outside production, in
`P:\Projects\Protfolio\.codex-local\maintenance-20261009`.

- `npm run build`: PASS on the final source. 55 Astro files, zero diagnostics;
  ESLint passes; 23 pages built, 21 indexed. Existing large-chunk and ineffective
  dynamic-import warnings remain, unrelated to the footer.
- Final `dist/index.html` SHA-256:
  `bb928dbc56a1764c788e815ccb1600df273f6641cd42e79ef625e9c740b541d7`.
- `check-footer-outro.mjs`: **50/50** functional rendered checks, recorded in
  `validation.json`. Covers 1691x872 normal/reduced motion, 390x844 mobile,
  1366x600 short desktop, and an inner-page static footer. Includes entry, fill,
  guide state, link bounds, logo/link clearance, horizontal overflow, header
  clearance/restoration, reverse reset, replay, and runtime exceptions.
- **11/11 final local pictures individually reviewed**: six desktop CSS phases,
  four home bottom states and the About footer. These six phase images pause and
  seek CSS animation clocks; they are simulated inspection, not native capture.
- `profile-footer-outro.mjs`: final build, natural CSS playback in isolated Edge.
  Whole-page 4.3s entrance: 0.803s task duration, 0.095s scripting, 0.011s layout,
  0.275s style recalculation, 231 layouts. This includes other page code and does
  not isolate footer CPU cost or establish native display pacing.
- Following 2s idle: **0 footer DOM mutations, 0 running footer animations,
  0 layouts, 0 style recalculations**. Whole-page tasks still used 0.082s and
  scripting 0.026s; do not claim the whole website is idle. The simulated persisted
  pagehide/pageshow reconnect probe passes; actual browser BFCache is not proven.
  Computed footer link size is 14px. See `performance-diagnostic.json`.
- `glyph-integrity.json`: **4/4 glyph path strings unchanged**. Protected identity
  GLB SHA-256 is still
  `04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.

Decision: **retain the structural correction as a local candidate**. The first
render exposed guides painting over the solid A and mobile header clearance;
both were corrected before the final checks. Preview is running at
`http://127.0.0.1:4321/`. No acceptance percentage is assigned.

**Not accepted as pixel-perfect.** The current backdrop is a restrained CSS
approximation, not a verified match of the reference's animated color field.
Line trajectories, easing and transition alignment still need chronological
comparison. The static inner-page footer also needs its own reference comparison.
Native control failed with `Computer Use native pipe is unavailable: failed to
connect native pipe: The system cannot find the file specified. (os error 2)`.
Isolated browser rendering is available, but native frame pacing, GPU/VRAM and
all-frame parity are unverified. No commit, push or deployment in this pass.
