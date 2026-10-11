# October 12: consolidated user feedback

This is the active checklist from BOTH detailed user prompts. Nothing below is
accepted solely from a build, source inspection or isolated screenshot.

## Constraints

- October 13: redesign Contact's left typography/style; preserve the animated
  illustration on the right. Candidate built, rendered acceptance OPEN.
- October 13: pointer still feels over-bloomed/heavy. Improve measured performance
  without sacrificing effects, motion or quality; no reduced-motion workaround.
  See the October 13 performance audit for source findings and pending measurements.

- Latest clarification: remove the ENTIRE homepage Writing section shown in the
  screenshot, not just its two separators. Remove its section-rail landmark and
  dead section CSS too. Keep the separate Writing route/articles and header/footer
  navigation. This supersedes the earlier separator-only interpretation below.
- Preserve the approved footer color and ANIK name animation. Change the contact
  section above it to remove the color seam.
- Preserve authored words except the requested Bengali project annotation and
  factual project dates. Preserve protected geometry and unrelated work.
- No speculative decoration. Compare the actual reference interaction before
  implementing it. Keep before, rollback, after and unresolved evidence separate.
- Latest screenshot set: user screenshots October 12 at 15:18:50 through 15:19:47,
  plus full reference/local background and stella feature-grid screenshots.

## Required work and acceptance ledger

| Item | Status | Required evidence |
| --- | --- | --- |
| White Mission magnetic response and later Vision soft fluid response | Whole-scene warp corrected; both regimes still OPEN; see October 13 log | Same pointer trajectories at aligned chapter positions |
| Contact-to-footer color seam | Provisional source fix | Both sides of boundary; footer unchanged |
| Entire homepage Writing section | Removed; rebuilt and verified live in Edge | Section/anchor/rail marker absent; Vision-to-Contact gap 0px; Writing navigation preserved |
| First-entry footer hitch | Prewarming implemented; timing OPEN | Cold entry and repeated entry timing; unchanged animation |
| Actual project dates | Repository history verified; fields implemented | Earliest repository history, not shared updatedAt |
| Bengali green project annotation | Implemented; placement OPEN | Reference placement and own accurate project text |
| Navigation and Contact pointer/hover interactions | Investigating | All five links, focus, reduced motion |
| Unwanted paper/folding background transition | Live flip mode excluded; rendered sequence OPEN | Identify live transition scheduler; preserve historical capture mode |
| LED grid, dots, monochrome sharpness and palette | Open | Full compositor comparisons, not grid-only claims |
| Quaternion controller ring color and drag details | Rebuilt; final-pose regression passes; live interaction OPEN | Each ring/axis, hover/drag/release/reset |
| Controller only in opening (October 13) | Implemented; six live scroll observations pass | See 2026-10-13-controller-visibility.md; explicit user preference differs from current reference Works visibility |
| Shape/surface appearance | Open | Protected geometry unchanged; aligned rotation/material inputs |
| Salty feature page inspired by stella | Open | Existing project facts/assets; feature hover/layout proof |
| Whole-site design and performance | Open | Native all-frame and pacing/CPU/GPU/memory gates |

Evidence and narrow rollback root: `D:\Portfolio Evidence\feedback-20261012`.
Earlier background measurements remain in `2026-10-12-background.md`; their
isolated passing results do not close the full background issue reported here.

## Implemented changes and limits

1. Project dates now read `firstRecordedAt`, not the shared `updatedAt`. Public
   GitHub default-branch histories were followed to their earliest available
   commit. Boilabin: 2026-04-14; Salty Steak: 2026-01-05; SoctuKit: 2026-04-29;
   UIU Discord Bot: 2025-11-09. Evidence with full hashes, API pages and commit
   links: `repository-dates.json` in the evidence root. These are earliest
   *recorded* commits, not proof of original inception: the Salty/SoctuKit first
   entries already describe developed functionality. Do not relabel them as
   verified inception dates. Fixed SoctuKit's stale repository owner and added
   Salty's public repository URL. All four project date/annotation data attributes
   were inspected in the preview DOM before browser disconnection.
2. Added project-specific Bengali annotations in the lime date row. The project
   selection updates both date and annotation. These preserve portfolio facts;
   the reference's Japanese company text was not copied. Visual placement and
   all four card transitions still need current-build capture.
3. Removed the contact section's separate red/purple gradient and overlay;
   its base is now black, matching the footer base. Footer colors and the ANIK
   letter sequence remain unchanged. The contact computed background was checked
   as rgb(0,0,0) with no background image; boundary screenshots remain pending.
4. Superseding the earlier separator-only change: removed the entire homepage
   Writing list, its rail anchor, scroll landmark and dead section CSS. The
   separate Writing route/articles and navigation remain. Current build passes
   Astro checks (61 files, zero errors/warnings/hints), ESLint and production
   build (23 pages). Live Edge DOM confirms the section, anchor and marker are
   absent, with Vision immediately followed by Contact and a measured 0px gap.
   Evidence: `writing-removal-dom.json`, `writing-section-before-removal.png`,
   and `writing-section-removed-boundary.png` in the evidence root. This closes
   this removal request only, not whole-site parity.
5. Live ambient background selection now chooses cut/random-cut and excludes
   flip. Historical deterministic capture mode remains available. This is the
   specifically requested exclusion of paper folding, not proof that all
   background transitions now match.
6. Footer field render targets and both drawing passes are prewarmed before
   visibility; outline preparation begins 250% of a viewport ahead. These changes
   target cold-entry allocation/compile cost. No new measured cold-entry result
   exists, so the first-entry hitch is NOT closed.
7. Controller now uses the measured 136-unit perspective projection at 108.8px,
   three projected rings, colored X/Y/Z axes, negative labels and yellow outer
   ring selection. Axis snaps, constrained ring drags, free drag, release and
   keyboard rotation follow the inspected reference controller math. Reference
   live DOM colors and dimensions were inspected; local live axis click was
   initiated but its settled result was not verified before connection loss.
8. Found a separate scheduling defect in the controller: SVG updates lived inside
   the model-change branch, so a final snap/reset pose could be skipped by the
   30Hz throttle and never delivered after motion stopped. Moved the throttle
   into `src/lib/quaternion-display.ts`, comparing the current pose with the
   last displayed pose on every render. Keyboard input also cancels an active
   axis-snap callback so it cannot overwrite the key adjustment. The numerical
   regression covers 25 stop-time/rate combinations (30/60/120/144/240Hz), final
   delivery, reset and zero repeated idle writes. This is CPU logic evidence,
   not native FPS or a rendered controller check. Narrow rollback:
   `rollback/controller-before-final-sync.ts`.

## White pointer audit: findings preserved, no speculative patch

Reference source inspected in the saved `reference-page.js`: GL, StableFluids,
Lerper and topSceneMixerFrag. The white mixer samples the entire scene at
`uv - fluid.xy * .01`; local light-chapters samples only its background at
`uv + wake * .01`. Therefore both sampling direction and affected layers differ.
Reference gain changes with Service entry: `.4 + visibleService * 10`, multiplied
by `length(fluid.xyz) * .1`; local uses a capped additive glow. The missing local
homepage Service stage also prevents a direct match of that progress parameter.

Do not introduce an extra vertical input sign flip. Although reference GL negates
its Y residual, StableFluids.setPointer subtracts that value again. The two signs
cancel; our bottom-left NDC input already uses the resulting convention. Earlier
summary notes mentioning only GL's negative sign were incomplete.

The earlier full-scene compositor experiment changed 15,847 resting zoom pixels
(max channel delta 192) and was rejected. Keep it rejected. Next correction must
first isolate render-target color/depth/antialias behavior, retain rest output,
then compare the same pointer trajectory in early Mission and late Vision. No
white-pointer production change was made during this audit.

## Validation and immediate next work

- Browser connection is restored after the user's follow-up. Edge extension
  browser `1` is available again; local and reference pages are open. The earlier
  connection errors below describe a resolved interval, not a current blocker.
- Latest correction removes the whole `.home-writing` section, its rail link,
  landmark measurement and unused section CSS. Before screenshot:
  `writing-section-before-removal.png`; narrow source rollback files have suffix
  `before-writing-removal`. Vision is followed directly by Contact in the DOM.
- Final build after the scheduling fix: `npm run build` passed, 61 Astro files
  with zero errors/warnings/hints, ESLint passed, 23 pages built and 21 indexed.
  Existing Vite >500kB chunk advisory remains. The first attempt failed the
  type-only-import lint rule in the new helper; corrected and rebuilt successfully.
- `quaternion-display-regression.json`: 25/25 numerical scheduling cases pass.
  `final-source-check.json`: all four unique dates and four nonempty annotations
  are present in built HTML; source and output SHA-256 provenance saved.
  These are source/static-output checks, not screenshots or motion validation.
- Restored the stopped preview process at `http://127.0.0.1:4321/` after building.
- Last connected-preview checks are narrow DOM/source checks above. The saved
  `reference-before.png` contains a loading overlay and is NOT a settled opening
  comparison. `local-before.png` predates the controller rebuild.
- Browser controls subsequently returned no browsers (`[]`), and both known
  browser `1` and named `edge` returned `Browser is not available`. New rendered
  proof is blocked; the user was asked to reconnect the browser session.
- Protected GLB SHA-256 was rechecked unchanged:
  `04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
- Full current-build native-frame comparisons: **0 newly accepted**. Controller
  interaction, white pointer, LED/full compositor, cold footer performance,
  Salty feature page and whole-site layout/motion are still OPEN.
- Resume with settled controller axis/ring/reset/keyboard tests and screenshots;
  then white pointer render-target isolation; then full LED compositor comparison.
  Do not confuse nine historical grid-only exact pairs with a full background
  match. Keep the separate About/Services/Works/Writing/Contact page queue and
  missing homepage Service stage from the whole-site/interior-page documents.

October 14 follow-up: removed the Contact kicker "Have a project in mind?",
its decorative rule and reserved top spacing. Full build passed; normal Edge
preview confirms phrase absent and original animated illustration retained.
Evidence: D:/Portfolio Evidence/contact-redesign-20261013/after-kicker-removal.png.
Controller cap removal has paired scheduling evidence; see
2026-10-14-controller-smoothness.md. Whole-site/native-frame acceptance remains open.
