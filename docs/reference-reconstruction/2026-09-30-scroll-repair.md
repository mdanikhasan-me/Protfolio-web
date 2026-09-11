# Scroll, title, glass and interface repair

This report supersedes the acceptance implications of the September 29 design pass. The user
rejected the combined build: pale blocks covered the project stage, the intermediate WORKS
chapter was missing, the cards felt flat, footer styling was wrong, and the Bengali copy was forced.
The user explicitly said to repair the current implementation without reverting the site.

## Confirmed causes and source repairs

- Astro emitted the page CSS before the shared BaseLayout CSS. Old `.curve-work` rules then
  replaced the transparent sticky stage with a pale, overflow-hidden, nonsticky block. Reproduced
  in the visible Edge browser and saved as `scroll-repair/broken-stage.png`. All site styles now
  enter through `src/styles/site.css` in explicit order. Remaining higher-specificity legacy
  control/detail rules were overridden explicitly. This is a cascade repair, not a redesign.
- The preview previously served the directory that `astro build` clears. The user observed a
  `/work/` 404 during development; that route returned 200 after the build. Preview now serves
  `.codex-local/stable-preview` at port 4321, PID 22976 at the time of this report. Build to `dist`,
  wait for successful completion, then copy completed output into the stable directory. Retain
  older hashed assets there so already-open pages can finish loading. Never clear this directory
  while serving. No production/deploy configuration was changed for this arrangement.
- Project snap positions used a different scroll formula from the renderer and arrow controls.
  All now use the same lead-in and project stops. Next/previous visibly traversed Boilabin →
  SoctuKit → Boilabin in a fresh capture.
- The opening now has a separate title interval before project cards. The first bright flat title
  was rejected. A ribbon experiment was also rejected: closer inspection found the reference's
  ribbon class exists but is marked hidden. The visible WORKS lettering belongs to the curved
  panel shader. The current title is projected into that wall with subdued neutral light, tilt,
  scroll-driven travel, panel seams and LED texture. Do not reinstate the flat plane or ribbon.
- Gallery planes became shallow curved boxes with side faces; edge samples and reflections use
  those faces. Front colors bypass chamber bloom/gain as requested. The desktop rail framing
  increased from 0.72 to 0.96, matching the observed reference card footprint more closely. Thin
  edge refraction and hover response are implemented; full glass-material parity remains open.
- Footer now uses the authored ANIK SVG, a drawing-to-fill reveal, dark background, restrained
  neutral links and compact copyright. The old teal block, condensed statement and colored name
  label were removed. The footer source is separate from the protected Send me a message block.
- Navigation spacing/type, project metadata alignment, upper-right controller, and lower-right
  article links were revised at the same viewport as the reference. Bengali is used for article
  summaries/supporting copy. The user accepted the simpler Bengali wording and said the first
  sequence was good; preserve it while refining surrounding UI.
- The controller's orientation updater expected SVG groups, but markup contained static spans.
  The SVG axes are now wired to the updater. Fresh input test: X-axis endpoint 61.00 → 59.55;
  held quaternion unchanged across a 450ms hold; reset returns `0.00 0.00 0.00 1.00`.
- A regular-weight interface mono font is scoped to `.reference-world` and navigation, leaving
  the contact typography untouched.

## New user report: title splits when the background changes

User screenshots `Screenshot 2026-09-30 020057.png`, `020100.png`, and `020103.png` show letter
segments offset at a fixed scroll position. Title projection consumed `vScreenUv`, which includes
per-tile randomized offsets. Candidate uses a separate unshifted `vTitleScreenUv`, preserving
procedural panel motion while decoupling letter placement. Snapshot: `source-before/title-uv-before.ts`.
Before capture: 120 simulated pictures 480-599 at scrollY 720. After capture and acceptance are
in progress at this report's initial writing. Overall color matching is a separate unresolved task;
do not compensate for this coordinate defect with global saturation or brightness changes.

## Fresh continuous evidence

All paths below are under SSD root
`C:\Users\anikh\.codex\scratch\portfolio-recovery-20260929\scroll-repair`.

| Capture | Purpose | Decoded video frames |
| --- | --- | --- |
| `current-full-scroll` | Current build after cascade repair, full down/reverse | 416 |
| `reference-full-scroll` | Fresh live Alche, full down/reverse | 819 |
| `sequence-repaired` | Explicit title interval, full down/reverse | 720 |
| `latest-complete` | Updated wall title, card depth/framing, full down/reverse | 659 |

These are **25-fps browser videos**, 1690x872 encoded from a 1691x872 CSS viewport. They are not
native 120-fps display capture. Complete decoded frame hashes were generated for these videos;
individual visual review remains partial. Neither those counts nor selected PNGs prove parity.
Latest-complete reaches the actual page end (scrollY=max=10269), covers all four project labels,
and reports no page errors. It predates the final scoped font/controller/title-stability edits.

Additional evidence:

- `title-study`: fresh reference video plus 22 settled positions from scrollY 0 to 1881, revealing
  curved/tilted wall lettering rather than the flat implementation. The user called it Work Pool/
  Work Holds; the visible reference text reads WORKS. Respect the intended behavior, not a guessed
  extra text label.
- `spiral-candidate`: rejected repeated ribbon experiment; do not count as accepted evidence.
- `wall-title-candidate`: corrected wall projection before the stochastic UV fix.
- `final-interactions`: hover input, arrow navigation, footer end state, and all four top navigation
  routes returning 200; no page errors or failed HTTP responses.
- `corner-ui-final/report.json`: controller SVG/hold/reset result and measured navigation styles.
- `card-volume-ui`: front, hover and turning observations of the new card side faces.
- `latest-complete/video-info.json` and `decoded-frames.md5`: video metadata and all decoded hashes.

## Remaining gates

## Later user steering and completed fixes (Sept 30)

- User explicitly requested removal of the email/Discord rows under the contact illustration
  and the homepage service-image block. Both are now removed; the contact title/illustration,
  writing list, footer links and dedicated Services routes remain. Earlier byte-identical contact
  claims apply to the earlier build only; this removal was explicitly authorized afterward.
- Added the left section tick rail and active labels, retained the controller through Works,
  implemented regular navigation character scrambling (ANIK alphabet), functional material
  roughness/noise/color controls, and truthful project update dates/kind/role tags.
- Material controls tested: values changed to 0.11 / 9.1 / red and restored to 0.10 / 9.0 / white.
  `material-controls/report.json`: zero errors; removed rows/scenes count 0; contact title count 1.
- Hover tested: intermediate `IkANi`, restored `Works`, link width unchanged at 39px.
- About has a dedicated two-column composition; profile facts moved after prose. This is a
  local layout improvement, not full page parity. Evidence `ui-outro-verified/about.png`.
- Added Works outro interval and wall flatten/zoom, then corrected initial narrow coverage from
  1.35 to 2.0. The first candidate exposed black side strips and is rejected. Actual block spacer
  keeps the canvas pinned while the pale scene wipes upward; padding alone did not extend the
  sticky containing block and was rejected. Project metadata now remains viewport-attached while
  active rather than climbing up during the card exit.
- The A's automatic/hover/scroll rotation is disabled in the outro, returning to identity.
  `outro-rest/report.json`: 15 consecutive readings remain the same orientation during pointer
  movement and scrollY 5200..5776. Quaternion w=-1 is equivalent to the identity w=1. No errors.
- RoundedBoxGeometry replaces the sharp card box. Full liquid-glass polish is still pending.
- Current motif experiment: physical tile aspect compensation only during outro. Initial
  1450..1569 capture had no affected isolated-A state and its last frame was unchanged; **do not
  call that a successful test of the motif fix**. Repeat on the mode-2 chapter beginning p1598.

Title UV fix update: 120/120 PNGs decoded, 119 transitions; pose matches 120/120 before/after,
navigation RGB identical 120/120. Six candidate frames individually viewed. A 27.6s real-time
scrollY=720 hold produced 690 decoded/hashed video frames at 25 fps, with 15 separate screenshots
(12 inspected so far); no page errors. The text is continuous in those inspected observations;
this is local defect evidence, not full chronological parity review.

Still required: finish motif zoom validation, true Vision close-up/transition, glass/material
and overall light/pattern matching, remainder of interior page design, complete continuous
native-rate evidence and native runtime profiling. Preserve the user's approved first sequence.

## Latest iteration status

- The isolated-A motif coordinate experiment now has an actual mode-2 comparison: 24 pictures
  beginning at p1598, with the gallery explicitly fixed at its exited position. The corrected
  symbol is wider and proportional in the inspected last picture. All 24 decode and 23
  transitions audit without errors. Report: `motif-isolated-integrity.json`. Earlier mode-2
  captures without an explicit gallery exit retained small gallery presence and are not the
  clean isolation. Do not turn these into full parity claims.
- Card geometry now has rounded edges. The first lens pass was rejected by the user for duplicated
  perimeter image strips and colored fringes on text. Its outward samples crossed UV bounds.
  Current sampling bends inward, clamps bounds, and restricts dispersion to the physical edge.
  A first inward strength was also visually too strong; reduced to 0.04 plus view-angle influence.
  `glass-balanced-live`: fresh continuous card turn/hover capture; front, turn and second project
  viewed, no page errors. Quality remains provisional pending fuller reference comparison.
- UI control detail now has six axis endpoints, 90px rings, slim custom range thumbs and a larger
  Writing label. A's color, roughness and noise controls are functional and default values remain.
- Surface-domain candidate: second triplanar noise sample changed from the same high-frequency
  coordinate as the first to objectCoordinate * detailScale, matching the reference's broader
  secondary domain. Before evidence `surface-domain-before` has 120 pictures p302..421. After
  build/capture and visual judgment are pending; do not assume it improves the material yet.

The user's goal is matching design, effects, motion, spacing and color with ANIK branding and
natural Bengali in the reference's Japanese-copy roles. A functioning repaired scroll is only a
prerequisite. Full surface/material fidelity, glass polish, continuous native-frame comparison,
mission/vision 3D choreography, service-wall motion, and measured native smoothness remain open.
No 100% match or full performance acceptance is claimed. Preserve protected GLB and contact area.

## Sept 30: curvature and controller follow-up

- Found why RoundedBoxGeometry did not curve the card face: its front face only had two distinct
  x positions. Replaced that helper with a rounded 64-by-16 face grid, retaining the existing
  cosine bend and bounded image sampling. Narrow rollback: `source-before/card-tessellation-before.ts`.
  `card-tessellation-controls` records next-button and focused reverse-key interaction: Boilabin,
  SoctuKit, Boilabin; no page errors. Three screenshots individually inspected from that run;
  the continuous video decodes to 219 frames at 25 fps, 1690x872. This is not native 120-fps proof.
  Retain the geometry correction; full glass polish and native all-frame parity remain open.
- User reported the quaternion drag was inert. Reproduced at scrollY=0: hit target was the
  transparent `reference-opening-stage`, not the visible controller. Added pointer pass-through
  to the opening chapter while retaining interactive descendants. Also suspended the automatic
  Works rotation while a captured drag owns orientation, and added lost-capture cleanup.
  `gizmo-hit-before` / `gizmo-hit-after` contain real pointer input and continuous videos.
  After: 3/3 stage hit tests reach the control; all 3 moved poses stay identical during a 600ms
  hold; release resumes intended behavior. Reset returns to identity (Works then resumes its
  automatic rotation). Zero page errors. Opening held screenshot individually inspected.
- Protected GLB SHA-256 rechecked: unchanged at
  `04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
- User now explicitly wants larger scroll gaps between opening name, WORKS, cards and final wall
  zoom. Pacing candidate extends opening to 280svh, outro to 240svh, delays name fade to 0.55..1.05
  viewport travel, WORKS reveal to 0.95..2.05, and wall zoom until the last project clears.
  Build passed; rendered pacing review is in progress. Background/material animation continues.
- Additional latest requests: the light About/Vision stage still needs real 3D choreography;
  footer name must form from converging construction lines before filling, rather than the weak
  single outline animation; dedicated Contact page needs redesign. Preserve homepage contact
  title/illustration. These requests are open, not silently dropped.
- Light-stage before capture saved as `light-sequence-before`; source rollback snapshots saved.
  Implementation was paused to prioritize the user's newly reported broken drag control.

## Current handoff after the afternoon continuation

Current instructions override the earlier automatic rotation behavior: the user explicitly says
the identity should rotate only with the pointer at the top. `top-only-rotation/report.json`
records one successful top pointer rotation and three unchanged orientations at actual scrollY
1600, 2895, and 6600, with no errors. The controller remains visible but is disabled outside the
opening and explains that state in its title. Project rail and wall/material animation continue.
The light-chapter scripted tilt/close-up remains the separately requested Vision choreography.

### Implemented, with bounded evidence

- Opening travel increased to 280svh and outro to 240svh. Camera pullback now follows opening
  scroll 0.35..1.25 viewports, rather than finishing on an earlier rotation trigger. WORKS has a
  hold between entrance and exit; card lead-in remains consistent across scroll, buttons and snap.
  `coupled-pullback-after` has continuous forward/reverse capture and 17 sampled screenshots;
  four individually inspected. This is not native-rate parity evidence.
- Found the persistent gray title/UI bug: scroll-bound opacity stranded the site at intermediate
  values when the user stopped. ANIK now completes a short time-eased handoff at 0.95 viewports;
  the opening UI is full-opacity while visible. `opening-contrast-after/report.json` verifies
  opacity 1 at scrollY 0/648/800, hidden at 950/1449, and restored at 652. Two screenshots reviewed.
- Custom dark material picker replaces native color popup: saturation/value drag, hue slider,
  numeric RGB channels, outside click and Escape. `material-picker-after` changes red then restores
  white, closes via Escape, zero page errors. Hue gradient initially lost a specificity contest;
  fixed with `input.color-hue`, confirmed computed rainbow gradient and height 5px plus screenshot
  `opening-contrast-after/picker-gradient-fixed.png`. Panel expands inline upward with its parent
  anchored near the bottom, rather than browser popup. Lowercase color label restored.
- Gizmo now draws three quaternion-projected orbit rings plus the double circular perimeter;
  removed white center dot that hid the Z label. Its hit-area/held-drag fixes remain.
- Background palette calibration is provisionally neutral RGB rather than red 0.6186 / green
  1.2032 / blue 0.9502. `palette-neutral-before/after`: 24 simulated pictures p1598..1621; after
  24 decoded/23 transitions/zero errors, last pair visually inspected. This restores warm/violet
  chroma but is NOT an aligned all-frame reference comparison. Earlier calibration statistics
  do not establish acceptance of this new candidate.
- A surface energy now uses the reference additive transmission/environment expression instead
  of replacing transmission with a dark environment mix. `surface-energy-before/after`: 24 PNGs
  each, last pair inspected; brighter colored material retained provisionally. The attempted audit
  output collided with an older report and did not overwrite it; rerun to a unique report name.
  Surface mapping/refraction and highlight quality still differ from reference.
- Opening pointer fluid feed now follows filtered NDC position at 10/s and filtered residual at
  20/s once per frame, matching inspected reference behavior; event-only injection was weak and
  discontinuous. `reference-pointer-study`, `current-pointer-before`, `current-pointer-filtered`
  contain continuous slow/fast/stop input captures. Three after screenshots inspected, no page
  errors. Strength and native timing remain provisional. Deterministic capture keeps its explicit
  input path and is not equivalent to this real-input test.
- New `light-chapters.ts`: lazy WebGL renderer, protected GLB clone, orthographic projection,
  depth-mask plus expanded back-face outline, side-only moving noise/color, Vision tilt and large
  close-up with text blur. Background uses fine grid/cross marks and pointer fluid. First candidate
  used EdgesGeometry and rainbow on all sides: REJECTED by user; missing contour and excessive
  rainbow are not accepted versions. Corrected `light-projection-after` has complete About contour,
  colored left side and close-up; three frames inspected, six-position forward/reverse capture
  records zero page errors. Some contour joins, exact side material and framing still need parity.
- Light grid and cross marks now scroll at different reference-derived rates (grid 1.5 cells per
  viewport scroll, crosses 0.1 world-size per viewport) with 5/s easing. `light-grid-scroll-after`
  records forward/reverse positions. Pointer feed now uses the same two-stage filtering, producing
  visible grid deformation and light wake. `light-pointer-filtered`: rest/moving/stop screenshots
  inspected. Its source hash was read after a subsequent reduced-motion/header-lifecycle edit,
  so it is NOT valid source provenance for that capture; actual served build was the preceding
  light-pointer build. Fresh final capture must supersede it.
- Reduced-motion light stage keeps scroll composition/zoom and material; reduces pointer force
  only. Header returns to dark-scene styling after light-stage exit. Latest build passed.
- Startup uses a 3-second expanding radial distortion/reveal based on reference final compositor;
  no random rotational shake. Skipped for reduced motion, deterministic replay, and restored
  nonzero scroll. `startup-radial-after`: eight sampled PNGs plus video, four inspected, zero
  page errors. Entrance still lacks reference's loading-logo construction layer and is not exact.
- Footer construction has 17 staggered drafting paths and four normalized wordmark outlines,
  then staggered fill. `footer-construction-after`: seven sampled PNGs plus video, three inspected.
  Static inline delay attributes triggered CSP errors; replaced by data attributes and JS style
  properties. Do not weaken CSP. `opening-color-current.partial/FAILED.json` retains 120 PNGs
  from the failed CSP capture; they are not an accepted capture.
- Dedicated Contact page is now a short personal two-column composition with bilingual note,
  email and Discord destinations, and compact links to preserved project/collaboration routes.
  `reference-footer-contact/contact-local-before.png`, `contact-local-after.png`, and
  `contact-report.json` record before/after and actual hrefs; after visually inspected. Ref Contact
  screenshot must be `contact-settled.png`; earlier `contact.png` caught a loading transition.
- User rejected generic/professional Bengali copy repeatedly, then explicitly said to use the
  current copy for now and prioritize visual work. Current mission: “নতুন কিছু বানাতে মজা লাগে।
  আপনার মাথায় কোনো আইডিয়া থাকলে, শুনতে চাই।” Vision: “ভালো লাগে বলেই এত সময় দিই।” About now
  uses short personal English copy, age 22 supplied by user, projects, with university/location
  in facts below. Stop proposing more unsolicited slogans.

### Evidence boundaries and remaining work

All new videos are isolated Chrome/Playwright diagnostics, usually encoded at 25fps. They are
not verified native 120fps recordings. Full 32,607-frame latest-build parity, complete individual
visual review, reduced-motion runtime proof, native CPU/GPU/VRAM/frame pacing, and mobile
acceptance remain OPEN. The archived native corpus begins after projects; its first frame must
not be used as a homepage-opening composition target. Align reference state/input, not just time.

Still unresolved: precise opening background sequence/color placement; A material/reflection
detail and highlights; exact card glass edge/refraction polish; whole-site pointer consistency;
light-stage material/contour and exit; reference loading construction; remaining interior-page
motion/layout; final all-frame/native performance gates. Retain all these in the task scope.
`full-review-latest` is the in-progress current-build continuous forward/reverse and route check.

Protected GLB hash reverified unchanged. No commit, push, deployment, or workflow edit.

Latest verification update: `full-review-latest` completed with unchanged source/build hashes
during capture, no page/console errors (the known ignored meta frame-ancestors warning excluded),
16 forward/reverse stops, and five routes returning 200 without horizontal overflow. Video has
870 decoded frames at 25fps, 1690x872; six stage screenshots individually inspected, not all 870
frames. `reduced-light-latest/vision.png` individually reviewed: requested reduced motion retains
the outlined 3D composition and colored side, no page errors. Native performance is not measured.
`surface-energy-current-integrity.json` now audits the correct 24-frame material candidate:
24 decoded, 23 adjacent transitions, zero errors. Only its final before/after pair was visually
reviewed. Do not confuse that integrity report with full reference/material acceptance.

Final hue-strip correction was visually verified and computed as a seven-stop rainbow gradient,
5px high. `opening-contrast-after/picker-gradient-fixed.png` shows it with the updated orbit rings.
Light grid scroll and filtered pointer are retained provisionally; exact reference force, contour
joins, lighting and color field still need comparison. Keep preview at http://127.0.0.1:4321/.
