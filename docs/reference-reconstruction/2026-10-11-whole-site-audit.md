# Whole-site visual and performance audit

## Scope and working contract

The October 11 request covers everything the visitor can see and operate, not only
the footer: layout, typography, imagery, geometry, materials, effects, input,
scrolling, transitions, navigation, interior pages, responsive behavior and speed.
Preserve the user's words, ANIK lettering and project identity. Read this file and
`00-master-state.md` at continuation. Update this ledger after each small change.

No part of the site currently has final whole-sequence reference acceptance.
Previously passing source checks and selected captures remain useful regression
evidence, not proof of perfection. A result must identify its exact build, input,
viewport, motion preference, captured interval and review coverage.

## Current baseline

October 15: opening return-to-rest now uses the reference's linear dt * force.
The independent combined hover/return regression fails before and passes all
20 trajectories / 23,760 simulated frames after; production build passes.
Fresh live verification is pending because browser execution tools are absent
from the current session. See `2026-10-15-pointer-return.md`. The latest CPU/GPU
captures and excluded interrupted run are recorded in the performance audit;
browser pacing, native circular input and all-frame acceptance remain OPEN.

October 14 continuation: fluid cadence, desktop precision, bloom cascade and
buffer rounding corrected separately; hidden white-side work removed with 40
unchanged full-pixel cases. See `2026-10-14-fluid-bloom.md` for bounded numerical,
GPU and live evidence. V04/V06/V13/P02 remain provisional or open, not accepted
whole sequences. Homepage Writing section and Contact kicker are removed per
user overrides; retained Writing routes still need their separate review.
Opening hover integration now follows the reference per-render force/damping;
20 numerical cases pass, with live sweep/controller/reset sanity checks. Contact
keyboard reveal and Enter navigation pass. Full native sequences remain OPEN.

- Published starting commit: `9be963e` (footer animation rejected by the user).
- Uncommitted footer revision is preserved separately; it is not user accepted.
  Four original letter paths and wording retained; fill finishes at 1.14 seconds,
  17 guides stay below copyright. Eight targeted checks pass in normal/reduced
  motion, with eight sampled pictures reviewed. Full animation parity is open.
- Homepage: Astro HTML, Three.js opening/Works renderer, separate deferred
  About/Vision renderer, Lenis scroll state, CSS/SVG footer and animated WebP Contact.
- Shared styles load in explicit order: global, reference, home chapters,
  interior pages, footer. Preserve this order when isolating regressions.
- Existing reference recording/corpus and calibration are listed in the master
  state. Reuse them; do not regenerate tens of thousands of pictures.
- New audit evidence: `D:/Portfolio Evidence/current-20261011/whole-site-audit/`.

## Work queue

Status: OPEN means no current complete acceptance; PROVISIONAL means an implemented
change has narrower evidence. Source observations and old findings must be verified
in the current rendered build before changing values.

| ID | Area / source | Findings and next measured check | Status |
| --- | --- | --- | --- |
| V01 | Startup / `reference-opening-locked.ts` | Check reveal, blank time, shader/texture readiness, reload and cached startup. Separate loading UI from the actual reference scene. | OPEN |
| V02 | Header / `index.astro`, `StudioHeader.astro` | Calibrate logo/nav bounds, type spacing, contrast through every section, hover and keyboard focus. | OPEN |
| V03 | Opening sculpture geometry | Historical comparison reports different topology; exact contour, width and placement remain unresolved. Protected GLB must stay unchanged. Test camera/pose before considering a geometry decision. | OPEN |
| V04 | Opening material / compositor | Noise scale 1.0 is provisional. Refraction, brightness, bevels and texture mapping remain mismatched; preserve resolution and effects during optimization. | PROVISIONAL |
| V05 | Pointer / `pointer-rotation.ts` | Refresh-dependent accumulation was corrected; user still rejected weak/late reaction. Measure fast sweeps, corners, reversals, leave/re-entry and settling against reference. | OPEN |
| V06 | Color/fluid / `reference-fluid.ts` | User reports exaggerated pointer color. Compare response gain separately from rotation gain and texture frequency. | OPEN |
| V07 | Opening text/background | White lettering projection, panel cuts, contrast and stochastic sequence remain unresolved. Align events before pixel comparisons. | OPEN |
| V08 | Works entry/exit | Check all forward/reverse boundaries, wheel, keyboard, native jumps and scrollbar movement; do not let snap compete with native input. | PROVISIONAL |
| V09 | Four project cards | Check framing, curved silhouettes, thickness, edge quality, navigation controls and text alignment for every card. | OPEN |
| V10 | Project-driven wall | Dark-art exposure correction exists. Check every project and both travel directions; first-card appearance does not prove later cards. | PROVISIONAL |
| V11 | Works-to-About | Verify wall zoom, stationary identity, handoff and header contrast at every boundary. | OPEN |
| V12 | About / `MissionChapter.astro` | Preserve Bengali/English wording. Compare type, tracking, placement, grid and reveal throughout scroll. | OPEN |
| V13 | Vision / `light-chapters.ts` | Continuous rim and side shader exist; contour/material and close-up composition remain provisional. Check first entry, zoom and reverse exit. | OPEN |
| V14 | Writing | Check layout, line wrapping, hover/focus, section transition and links. | OPEN |
| V15 | Contact | Keep title and illustration. Check sticky clipping, image readiness, animation cost and transition into footer. | OPEN |
| V16 | Footer | Deployed sequence rejected. Shorter revision tested locally; reference timing/composition and user acceptance remain open. | PROVISIONAL |
| V17 | Works archive/details | Check all filters, cards, route destinations, image crops and long content; use the site's content, not reference words. | OPEN |
| V18 | About/services/contact interiors | Check template consistency, navigation, forms/links, hierarchy, focus and mobile wrapping. | OPEN |
| V19 | Writing/search/remaining routes | Audit every built HTML route, search results, article typography, no-results, 404 and auxiliary page navigation. | OPEN |
| V20 | Responsive/accessibility | Breadcrumb/header collision repaired on eight detail routes; 18 layout cases pass, eight desktop images unchanged. Touch, menu, focus, live motion changes, zoom and wider responsive comparison remain. | PROVISIONAL |
| P01 | Startup/network | Baseline current resources, duplicate fetches, long tasks and render readiness. Homepage JS currently ~728 KB uncompressed; size alone is not a measured bottleneck. | OPEN |
| P02 | Runtime CPU/GPU | Covered renderer defect repaired: 18 boundary and six resize cases pass. Native CPU/GPU, memory, teardown and full visible-interval measurements remain. | PROVISIONAL |
| P03 | Frame pacing/input | Record real display pacing and pointer/scroll latency; headless rAF intervals and deterministic replay are diagnostics only. | OPEN |
| P04 | Delivery/regressions | Source build, local rendered tests, production deployment and live verification are separate gates. Keep preview available and each patch reversible. | OPEN |

## Chunk protocol

1. Select one ID and one measurable defect. Save source rollback and before capture.
2. Record an explicit hypothesis, intended behavior and pass/fail conditions.
3. Apply the smallest change; no unrelated styling or content rewrite.
4. Build, then render the new build with the same input and dimensions.
5. Compare the affected sequence plus neighboring sections; test reverse traversal.
6. Record exact coverage, regressions, performance cost and retain/reject decision.
7. Mark only the demonstrated gate complete. State the next ID and remaining work.

## Running findings

### October 12: latest user corrections — do not lose at continuation

The task remains the entire visible website, including every small control,
lettering treatment, sculpture, material, background, transition and pointer
effect. Preserve actual words and ANIK letters. The user explicitly rejects
invented animation and isolated footer checks presented as whole-site proof.

- **V07 background:** compare panel seams, fine grid, LED dots, perspective,
  brightness, palette and movement. User crops `Screenshot 2026-10-12 025554.png`
  and `025539.png` visibly differ; neither crop alone establishes aligned time,
  viewport or identical pattern. Do not compensate with arbitrary color changes.
- **V12/V13 pointer:** there are TWO white-section responses. Earlier response
  feels immediate/magnetic; the soft ocean-like response belongs near the END
  of the white chapters. Do not replace both with a single watery effect or
  remove the late soft effect. Compare entry, middle, exit, fast/slow paths,
  reversal, resting pointer and decay. Reference image: `025800.png`.
- **V02 Contact:** reference has a rolling duplicate-label hover, shown in
  `025744.png`; the baseline only changed its background/text color.
  Preserve the local Contact wording and arrow; inspect timing and clipping.
- **V11/P03 lag:** latest green-A screenshot identifies Works-to-About entry.
  Native forward/reverse input and actual presentation pacing remain required.
  A fast isolated RAF loop does not refute the user's lag report.
- **Whole-site scope:** sculpture shape/material, joystick, opening type,
  every project/card-driven reflection, About/Vision, Writing, Contact, footer,
  interior routes and responsive behavior remain in the queue above. Prior
  storage/Git/SEO requests are retained in history, not silently called finished.

Evidence root for this continuation: `D:/Portfolio Evidence/transition-20261012/`.
The first headed instrumented run (`before/report.json`) exercised ten hold/wheel
phases on RTX 3070 at 1912x948, DPR 1.5, normal motion. No page errors/long tasks;
opening GPU batches averaged 1.93–2.23 ms, light batches 0.16–0.22 ms. RAF reports
approximately 240 Hz despite the earlier display query reporting 180 Hz: these
intervals are NOT accepted as native presentation FPS. No lag fix is established.
`reference/handoff.png` accidentally captured the opening after the reference's
scroll position reset; it is NOT valid handoff evidence. Preserve that failure.

### V02: measured Contact label motion retained, October 12

Actual reference SlotButton CSS in `footer-reference-match/reference-visible.html`
uses a 300 ms `cubic-bezier(.25,.46,.45,.94)` upward label translation with opposing
opacity fades. Local `index.astro` and `reference-locked.css` now implement that
motion, including keyboard focus. Actual wording remains Contact with its arrow;
the second label is hidden from assistive technology. Reduced motion changes the
state immediately. No JavaScript animation loop was added.

Rollback: `transition-20261012/contact-hover-rollback/`. Evidence paths below are
relative to `D:/Portfolio Evidence/transition-20261012/`.

- `contact-hover-final/report.json`: 74 controlled CSS replay pairs (37 dark,
  37 actual light-section states, 0..300 ms at 120 steps/second). Largest normalized
  travel/opacity difference from the reference CSS fixture: 0.0000000675971.
  This compares the label curve, not the whole reference page or native frames.
- Six functional checks pass: keyboard focus, blur restoration, pointer hover,
  pointer leave, reduced motion, single accessible Contact label. Zero page errors.
- Four final screenshots individually reviewed: dark/light at 150 and 300 ms.
  The earlier two runs preserved in `contact-hover/` and `contact-hover-verified/`
  failed focus checks. The harness kept its local page behind the reference tab;
  bringing it forward fixes the test. `contact-hover-focused/` passes interaction
  checks but its synthetic light attribute could be overwritten by runtime.
  The final run uses real scroll position and asserts the actual surface state.
- Connected Edge keyboard navigation independently reaches Contact, displaying
  the incoming label at -14 px with opacity 1 and a visible focus ring. Screenshot:
  `contact-hover-focused/native-keyboard.png`. This is one rendered endpoint.
- Production build passes: 56 Astro files with zero diagnostics, ESLint, 23 pages,
  21 indexed. Existing chunk-size/dynamic-import warnings remain. HTML SHA-256:
  `11f1ce277ce59d9c13584f6c0f7092d3734ab76cb3f0a33fa2bd1195349d5b98`.
  Protected GLB hash rechecked unchanged; `git diff --check` passes.

Decision: retain the bounded Contact label correction. Header geometry, full-site
pixel parity and native continuous animation acceptance are still open.

### V12/V13: white pointer source findings, not an implemented fix

Saved actual reference `reference-page.js` composites the complete mission/vision
scene at `uv - fluids.xy * .01`, followed by another -.001 fluid displacement in
the final composite. Local `light-chapters.ts` instead warps only its grid using
`uv + wake * .01`; the identity outline and colored side do not share that warp.
This is a concrete direction/coverage mismatch. Merely changing the sign would
leave the object unresponsive, so it must not be called a completed pointer fix.

Reference mission/vision fluid brightness depends on `.4 + uVisibleService * 10`;
local uses a fixed capped additive glow. This supports examining the user's
early/late distinction, but the exact scroll mapping and live input response
still require comparison. Preserve the softer late response. No speculative
pointer-shader adjustment was retained in this chunk.

Reference Works outro interpolates the projection matrix toward orthographic;
local FOV changes and a straight DOM section boundary are not equivalent to the
reference's velocity-dependent curved composite edge. V11 remains unresolved.

Next isolated chunk: record matched white-section input at early/middle/late
scroll states; correct scene-wide pointer displacement with unchanged resting
frames, then measure the separate late response. Background sampling, sculpture,
all card reflections, footer and remaining route/performance gates stay open.


### Inventory and baseline inspection

Source review confirms visibility guards for both WebGL renderers, deferred loading
for light chapters, and a continuously scheduled scroll-state loop. These are
inspection findings, not evidence that runtime suspension or cleanup works.
Motion preference is sampled once at initialization in several controllers, while
CSS and nav hover use live media queries; changing the OS preference without reload
needs a separate behavior check. No effects have been disabled for this audit.

The prior footer record's retained-change language is superseded by the user's
rejection. The current footer stays a provisional local candidate during the wider
audit. No push is needed merely to create a baseline.

### First whole-site capture pass

Evidence: `whole-site-audit/baseline-ready/`. Build HTML SHA-256:
`267afbd92e7c4bf3e9c8d151b33420220ebf0461b0136c58ee11de8341bfaf0d`.
All 23 built HTML routes loaded at 1691 x 872 and 390 x 844: 46/46
HTTP 200, zero page exceptions, zero document horizontal overflow, one H1 each,
zero broken loaded images and zero unnamed buttons in the basic DOM probe.
Opening `/404.html` successfully does not prove the server's unknown-path status.

Individually reviewed 46/46 route-top pictures and 7/7 desktop homepage section
pictures. These are sampled layout reviews, not full-page, interaction, animation
or native reference comparisons. The home route-top capture sampled startup;
its distorted bright mass must be evaluated on a timed sequence, not treated as
the settled shape. The seven section captures include a settled opening frame.

Concrete findings:

- Nine auxiliary routes (`404`, seller interest, hire, Salty Steak lab, now,
  open source, privacy, resume, search) use the older light header/theme. Their
  main content runs flush against the viewport; giant headings and concatenated
  assembly labels indicate missing/inconsistent template styling. The 404 heading
  also sits behind its header. These routes need a consistent template, retaining
  all current wording and links (V19).
- Eight dark detail routes (three service, three project, two writing) have
  breadcrumbs underneath the second header row at mobile width. Zero horizontal
  overflow did not detect this collision. Fix header clearance separately (V20).
- Main dark interior pages have readable top-level hierarchy, but tight type,
  bright grid crosses through text and spacing remain reference-comparison work;
  no visual acceptance is implied (V17/V18).
- Contact's illustration and heading load; footer settles to filled ANIK. Neither
  static sample proves the requested motion or transition timing (V15/V16).
- About/Vision outline, side material and zoom still require sequence calibration
  against the existing reference corpus (V12/V13).

Later recovered evidence also matters: `2026-10-09-pointer-strength.md` records
seven diagnostic pointer paths and a fluid accumulation correction (local peak
0.588 to 0.207, reference 0.201). Those narrower results supersede earlier weak
settings; native pointer response and whole-sequence parity remain unaccepted.

### P02, chunk 1: stop covered renderers

The seven-state runtime probe found opening draw calls while About covered it,
and light-scene draw calls while Writing covered it. Four-second samples recorded
15,424 opening draws at About and 4,805 light draws at Writing. These are
instrumented headless WebGL calls, not displayed FPS or GPU utilization.

`boundaries-before/report.json` reproduces the defect in 18 forward/reverse states
across normal and reduced motion: 12 passed, six failed. A 30-pixel inset removes
fractional boundary ambiguity. About/reverse-About wrongly ran both renderers;
Writing wrongly ran the covered light renderer in both preferences.

Rollback: `render-boundary-rollback/reference-opening-locked.ts` and
`render-boundary-rollback/light-chapters.ts`. Hypothesis: the opening world's
overlap extends its intersection behind opaque About; light rendering's 100-pixel
root margin extends behind Writing. Cache the opening's visible end during
layout measurement and suspend at coverage. Keep shader/asset prewarming but
restrict continuous light rendering to actual intersection. Resume on reverse
scroll; preserve visible shaders, resolution, geometry and motion settings.

After evidence: `boundaries-after/report.json`, 18/18 cases pass, zero page
exceptions. The covered opening now issues zero draws at About/reverse-About;
the covered light renderer issues zero at Writing. Both still draw where both
are visible, and resume when traversing backward. Six paired before/after
screenshots were individually reviewed (12 of 36 pictures): normal before-About,
About, Vision-exit, Writing, reverse-opening, plus reduced-motion About. No missing
visible scene was seen in those samples; animation phases are not synchronized
and exact whole-frame equality is not claimed.

`scroll-after/report.json`: 8/8 existing scroll recovery cases pass, zero errors,
zero failures, normal and reduced motion. These include native scroll jumps,
simulated stepped autoscroll, Control+Home and reload. The eight saved regression
pictures were not individually reviewed in this chunk. Build for both suites:
`d04a0ec4bbab24998beae6a3346f2186c1719893ae61a0cacd703cc4a7def956`.

`resize-after/report.json`: 6/6 additional cases pass after changing the viewport
to 1280 x 720 and back to 1691 x 872, covering About, Writing and reverse-opening.
This addresses stale cached boundaries after resize. Its later build also includes
the mobile breadcrumb CSS below; WebGL source is unchanged between these suites.

Decision: **retain this narrow hidden-work correction**. This is not native FPS,
input latency, reference parity or final performance acceptance. No shader,
render-target size, material, pointer gain or protected geometry changed.

### V20, chunk 2: breadcrumb clearance

Hypothesis confirmed in the source: the mobile studio header occupies two rows,
but breadcrumbs inherited the shorter legacy header's offset. Added mobile-only
breadcrumb clearance and reduced the redundant following hero padding. All words,
links, typography assets and desktop layout are preserved.

Rollback: `studio-pages-before-breadcrumbs.css`. Before: the eight corresponding
390-pixel route captures in `baseline-ready/`. After: `breadcrumbs-after/`.

- 18/18 layout probes pass: all eight detail routes at 1691 and 390 pixels wide,
  plus the longer article at 320 and 760. No page exceptions or horizontal overflow.
- Individually reviewed all ten after pictures at mobile/tablet widths. Breadcrumbs
  sit below navigation and long titles wrap; 320-pixel headings remain large and
  are still part of the wider typography audit.
- Eight desktop after pictures were compared by decoded RGB against the initial
  route baseline: 8/8 exactly unchanged. This is regression evidence against the
  local baseline, not equality to the reference website.
- Latest HTML build SHA-256:
  `97ee37f7d9ec56146f03882799bb720e5c06b816ffebff8063c583b2fd5bb33e`.

Decision: **retain the collision fix**. Full responsive/accessibility acceptance
remains open. Do not describe these two repairs as completion of their whole IDs.

### Current handoff / next chunks

**Later October 11 steering:** the user explicitly returned to the footer. The
V16 structural correction and its separate evidence are in
[the footer outro report](2026-10-11-footer-outro.md). It replaces the provisional
short reveal mentioned below with a pinned construction sequence. The earlier
hidden-WebGL and breadcrumb repairs remain intact; no whole-site acceptance is
implied. Resume the remaining queue after the footer comparison gates.

Completed: initial 23-route/two-width audit, 53 baseline picture reviews, two
narrow repairs with the evidence above, successful final `npm run build`
(53 Astro files with zero diagnostics, ESLint pass, 23 built pages, 21 indexed),
and `git diff --check`. Existing Vite large-chunk and ineffective-dynamic-import
warnings remain tracked under P01. Protected GLB SHA-256 rechecked unchanged.
Preview remains at `http://127.0.0.1:4321/`.

No new deployment, storage deletion, SEO account change or Git history rewrite
was performed during this whole-site audit. Earlier footer source edits remain
provisional. Current CUA inventory exposes no browsers/apps, so native visible
comparison and actual display pacing are still unavailable; isolated headless
browser diagnostics above are explicitly separate evidence.

Next: resume desktop opening geometry/material and pointer/color comparison
(V03-V07) using the saved reference and synchronized input; then every Works card
and wall response (V08-V11), light chapter transitions (V12-V13), and Contact/footer
(V15-V16). Nine auxiliary templates still need consistent framing (V19); the
remaining queue, interaction coverage and native performance gates are unchanged.
There are 20 visual areas and four performance areas in this ledger, **zero with
final all-frame reference acceptance**. Two bounded defects are repaired; do not
turn that into a fabricated overall completion percentage.
