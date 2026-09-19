# Reference reconstruction: recovered state

Updated 2026-09-29. This is a continuation of thread `019fe377-48e0-7bc2-a899-8c82ad2d0717`, not a
new design or a parity acceptance.

## Recovery and baseline

- Current starting commit: `e82582faafb1a2b33d3ad73a5dea03a735b381b2`.
- Branch: `reference-background-refinement-20260806-1532`; clean at the start of recovery.
- The entire 6,456,203,847-byte conversation log was parsed: 29,155 records, 108 user messages, 804
  assistant messages, and 71 compactions. Embedded image bytes and encrypted compaction payloads are
  not new visual reviews.
- Searchable local extracts: `.reference-local/recovery-20260929/`. `messages.jsonl` and
  `tools.jsonl` retain original conversation line numbers.
- Original baseline branch still exists at `834b10e`:
  `backup/immutable-golden-baseline-20260803-021541`. Its annotated tag and sibling filesystem
  snapshot also still exist. Their existence is verified; their whole snapshot was not rehashed in
  this recovery.
- Never restore the old baseline over the current work unless explicitly requested. Recovery for an
  experiment means undoing only that experiment.
- No commits, pushes, deployment, model replacement, or broad source restoration have been performed
  by this continuation.

## Rules recovered from the conversation

1. Preserve ANIK branding, top-left identity, authored typography, routes, and project content.
   Match the reference's visual and motion systems using this portfolio's identity.
2. Preserve `public/media/identity/reference-a-desktop.glb` byte for byte. Its SHA-256 is
   `04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`, verified again today.
   Surface/refraction work does not authorize remodeling the geometry.
3. Keep the large ANIK typography in the opening. Remove it before the project state, not from the
   homepage. Keep its bloom/refraction and animated surface behavior.
4. Preserve pointer, controller, fluid, scroll, and project-rail motion. Do not hide glitches or
   claim optimization by freezing the object or removing animation.
5. Project art drives the curved LED background's color and movement. Do not insert readable
   reference project content or reference branding into the chamber.
6. Preserve the final conversation's project-rail work. The original brief excluded a separate
   reference work showcase; later requests explicitly require improving the existing project rail.
   Do not delete the current rail based on an older scope sentence.
7. Match displayed color, brightness, contrast, bloom, panel layout, texture, opacity, and
   transitions. A hard cut can occupy one 120-fps frame; do not invent a crossfade.
8. Reduced motion retains the same designed stage, materials, typography, project positions, and
   visual signature. Scale motion/workload without degrading the composition.
9. Work on one isolated factor at a time with before/after evidence and a narrow rollback. No
   speculative redesign, broad formatting, or changes to unrelated projects/accounts.
10. Reuse completed reference analysis. Do not regenerate huge corpora or delete browser profiles,
    cookies, autofill, or accounts. Put new large captures on the SSD and bound jobs.
11. Desktop acceptance precedes mobile. Performance must include measured frame pacing, CPU/GPU,
    memory/VRAM, render-target cost, and stability, alongside visual quality.
12. Use one Luna comparison agent when useful; implementation and acceptance judgment stay with the
    primary agent. Reports must disclose exactly what was inspected.

## Evidence rules

The permanent unit is every chronological native source frame. At 120 fps, one second means 120
frames. Preserve every frame and adjacent transition; no sparse screenshots, contact sheets,
averages, or source/build/HTTP results substitute for this requirement.

Keep these states distinct: `EXTRACTED`, `INTEGRITY_VERIFIED`, `MACHINE_ANALYZED`,
`VISUALLY_REVIEWED`, `COMPARED`, `SOURCE_VALIDATED`, `RENDERED_VALIDATED`, `PERFORMANCE_VALIDATED`,
and `ACCEPTED`. Report exact counts and missing gates.

Frame alignment is by the same visual event/input/scroll state, not blindly by video timestamp. The
user's clarification at original log line 14847 explicitly accounts for different scrolling and
intentional brand/content differences. Do not claim numerical pixel equality between different
words, geometry, or project screenshots.

Deterministic 1/120-second renderer stepping proves an ordered simulated sequence. It does not prove
a browser sustained 120 fps or that a native recording captured every displayed frame. Record actual
timing, build provenance, input schedule, resolution, hashes, and error state. A PNG hash is not
source-video decoded-pixel equivalence.

## Reusable authoritative evidence

Reference video: `C:\Users\anikh\Videos\NVIDIA\Desktop\New folder (2)\pc version reference .mp4`.

Corpus root: `C:\Users\anikh\.codex\scratch\portfolio-reference-native-20260809\reference`.

| Gate                                        | Recovered / rechecked result                        |
| ------------------------------------------- | --------------------------------------------------- |
| Native source / extracted corpus            | 32,607 pictures, 2560 x 1440                        |
| Saved source-vs-PNG RGB manifests           | 32,607 / 32,607 rows; zero row differences          |
| Machine analysis and classification         | Validator rerun today: 32,607 / 32,607, zero errors |
| Adjacent transitions                        | 32,606 / 32,606, zero errors                        |
| Historical visual-review ledger             | 32,607 unique rows, contiguous 1..32,607            |
| New visual review of entire reference today | Not performed; reuse the historical ledger          |
| Current-build full comparison / acceptance  | Not yet proven                                      |

The native recording includes browser chrome. The historical analysis used `[0,64,2560,1360]`,
giving 2560 x 1296 pixels without resampling. **This crop is not accepted as the exact website
viewport.** Current inspection of native picture 1 places the top content boundary at row 80 and the
bottom border at row 1388. The old crop includes 16 rows of browser chrome and omits lower content.
Its validator proves consistent processing under that crop, not correct viewport alignment. Preserve
the old evidence; calibrate content bounds, scrollbar/browser overlays, and CSS/device pixel ratio
before using pixel statistics for final parity. The controller replay uses the historical size only
for an internally aligned before/after regression test.

The visual-review state file still says machine analysis is running and browser access is pending.
Those fields are historical; the completed analysis has now been revalidated. Do not overwrite the
historical ledger to imply a new review.

Revalidation report: `.reference-local/recovery-20260929/reference-analysis-revalidated.json`. The
original chronological tools remain under
`.codex-local/reference-background-refinement-20260806-1532/sequence-analysis-tools/`.

## Existing work and remaining gaps

The history contains fixes for native-frame background cuts, pointer response, environment seams,
live material, project-wall color, bloom/compositing, reduced-motion stage preservation, controller
bounds, texture readiness, and rail snapping. Much of the later work was consolidated in `6771da9`.
Preserve it; implementation is not final acceptance.

The final conversation still rejected object-surface parity and synthetic Works parity. Its v9
report described approximately 42% reference wall brightness and 31% wall motion; these are
historical reported numbers, not measurements of today's build. No final full-site acceptance record
was found after those changes.

The old `live-pointer-normal-v11` and `live-scroll-normal-v11` folders contain 120 PNGs each, but
their capture script sleeps 9 ms between input and screenshot encoding and records no timestamps.
Its `INTEGRITY_VERIFIED` label checks only count/minimum bytes. Treat these as sampled observations
with unknown elapsed duration, not 120-fps coverage. They lack a build manifest, decoded-pixel
hashes, all-frame comparison, and performance trace.

## Active work

- **October 9 pointer response correction:** read
  [the input response record](2026-10-09-pointer-response.md). Removed the reduced-motion
  penalty on direct pointer input and corrected refresh-dependent rotation accumulation.
  Numerical checks cover 30/60/120/144/240 Hz; reduced and normal input agree in ordered
  replay. Six normal-mode frames remain pixel-identical to the prior build. Eight scroll
  regressions pass. The user's overall smoothness complaint is not closed by these checks;
  no native FPS improvement or reference parity is claimed.

- **October 9 storage/history continuation:** read
  [the storage and history record](2026-10-09-storage-history.md). The complete
  portfolio scratch evidence now lives on the D: SSD; original C: paths are
  junctions. All 50,499 relocated files passed SHA-256 verification and the
  32,607-frame reference analysis passed revalidation. All 220 historical messages
  were simplified and pushed with original dates preserved; recovered work uses requested
  September author dates with actual source timestamps documented separately.
  GitHub Pages deployment passed. Fresh build and eight scroll checks pass.
  Continued with the clipped RGB readout: a 276px fieldset keeps it visible at
  four screen widths, and picker/Escape checks pass. Full parity remains open.

- **October 1 native scroll and performance:** read
  [the scroll/performance ledger](2026-10-01-native-scroll-performance.md).
  Fixed stale project state after native upward scrolling and snapping competing with native
  scroll input. Connected Edge middle-button autoscroll reaches the actual opening. Eight
  normal/reduced-motion browser regressions pass. Redundant DOM writes are reduced; no effects,
  shader quality, or motion are removed. A camera cache experiment was rejected after one
  differing replay frame and narrowly reverted. Full native frame pacing and parity remain open.

- **Latest content request:** [Salty Steak update](2026-10-01-salty-steak-update.md): supplied
  image now used for Salty Steak, second project; refresh-to-top verified in connected Edge.
  Existing project URL preserved. This does not close the prior visual/performance audit.

- **October 1 live-sequence continuation:** [live sequence ledger](2026-10-01-live-sequence.md).
  Live name/pattern/panel timers are now separated from forensic replay; normal browsing no longer
  inherits name-blanking mode 3 or frozen stochastic seeds. Vision has a derived continuous front
  contour and a shared-noise side material candidate. Exact material and native parity gates remain open.

- **Latest section-boundary work:** [boundary audit](2026-09-30-boundary-audit.md). User clarified
  pointer reaction only at top, subtle deterministic scroll rotation elsewhere (no idle spin).
  Fixed light canvas covering Writing, reordered footer to reference link-first hierarchy with
  continuous interior grid, centralized header contrast, prepared Vision shaders before entry,
  and fitted portrait camera/typography. Four-width checks are diagnostics, not full parity.

- **Latest September 30 state:** read [the continuation ledger](2026-09-30-scroll-repair.md),
  especially its final section, before relying on older behavior descriptions below. User now
  explicitly requests pointer rotation only in the opening; automatic Works/scroll rotation has
  been removed under that instruction, not as a performance shortcut. New light-chapter WebGL,
  material picker, Contact composition, startup radial reveal, and footer construction animation
  are implemented locally. First light-chapter rainbow/fragmented-outline versions were rejected
  and corrected. Full reference parity and native performance remain unproven.

- **Current Sept 30 continuation:** user rejected the combined layout, then clarified the exact
  intro/title/card sequence and later approved the first sequence while requesting corner UI
  refinement. The pale project-stage regression was reproduced and fixed through explicit CSS
  cascade order. Preview now serves `.codex-local/stable-preview`; do not clear it during builds.
  Fresh reference/current continuous videos, wall title, snap fix, card volume/framing, footer,
  Bengali/UI and controller repairs are in [the current handoff](2026-09-30-scroll-repair.md).
  WORKS lettering is now decoupled from random per-panel UV offsets. Later work adds material
  controls, section rail, truthful project tags/dates, header scrambling, revised About, and a
  post-project wall zoom with a stationary A. The user rejects the current glass/material quality;
  current active factor is bounding card lens sampling (repeated edge strips rejected), followed
  by surface/noise and lighting. Vision close-up is still missing. No full parity acceptance.

- User expanded scope to A surface, original-color curved project art, lower home sections,
  all top-level page designs, Bengali accents, and smoothness. **Preserve Send me a message title
  and illustration.** User subsequently authorized removal of the email/Discord rows beneath it
  and the homepage service-image block; both are removed. Do not restore those blocks.
  Project color rendering, Works archive/filtering, scoped interior styling, mission/vision/service
  sections, a provisional A energy correction, and a pixel-identical depth-copy optimization are
  now implemented. See [the current design work and exact gates](2026-09-29-design-expansion.md).
  These are local improvements, not full reference acceptance; native performance remains open.

- Latest retained local correction: chromatic pattern begins at p17,682 rather than p17,698.
  All 24 reference/current pictures p17,680-17,703 individually reviewed by the primary;
  24 candidate PNGs integrity-verified and 23 transitions measured. Nine affected before/after
  overlap pictures improve in all three wall regions; two preceding pictures are RGB-identical.
  Spatial color and surface mismatch remain. See [the color-cut decision](2026-09-29-color-pattern.md).

- Current visual factor: missing monochrome panel release at p17,578. A one-factor blackout-release
  candidate is implemented and built. All 120 frames/119 transitions measured; pre-cut 37 frames are
  RGB-identical, lower-left post-cut pixel error improves 11.26%. Retained provisionally pending
  complete visual/exit review. See [the candidate decision](2026-09-29-background-cut.md). Do not
  call full parity accepted.

- Build hygiene: exclude only local Codex evidence/cache folders from ESLint and Prettier. Initial
  lint traversed archived browser/reference bundles and failed with 16,952 errors. After the
  exclusion, source checks and production build pass (23 pages, 21 indexed).
- Asset delivery: small bundled font subsets violated `font-src 'self'` after inlining. Disable
  asset inlining; keep the existing strict CSP and exact authored font bytes.
- Controller correction: pause return-to-rest during a held drag. Clean 120-step baseline, normal
  candidate, and reduced-motion candidate are captured and fully decoded/hashed. The baseline drifts
  in 88/89 held steps; both candidates drift in 0/89, and release returns. A separate 240-callback
  real-input hold also remains stable. See [the validation report](2026-09-29-validation.md) for
  scope and evidence limits.
- Current preview: `npm run preview -- --host 127.0.0.1 --port 4321`.
- Browser route: connector and native helper unavailable; existing isolated Playwright plus
  installed Chrome can render the current build. No production browser dependency added.
- Ordered test harness: `scripts/validation/capture-controller.mjs`.
- Capture-scale correction: `__captureWidth`/`__captureHeight` remain CSS dimensions;
  `__capturePixelRatio` supports 1-1.5 (default 1). The capture bridge now reports backing
  dimensions plus CSS size and ratio separately. Normal runtime sizing is unchanged.
- New capture root: `C:\Users\anikh\.codex\scratch\portfolio-recovery-20260929`.

The first 120-step controller run is retained as failed evidence because it exposed CSP font errors.
It also shows rotation returning toward rest during a held drag. A clean baseline follows the
asset-delivery fix; do not treat that failed run as acceptance.

The new crop diagnostic decoded 32,607/32,607 reference frames: 32,550 top-boundary detections at
row 80, 57 other detections; bottom boundary at 1388 or 1392. See the validation report. It verifies
the crop problem across the sequence without regenerating the full corpus.

The normal controller candidate has now been visually reviewed 120/120: Luna 1-80, primary 81-120,
with a hash-linked ledger. No transient flash/disappearance was observed in that test; persistent
clipped highlights remain a separate surface problem. The reduced-motion capture has complete
machine auditing but no all-frame individual visual review.

Fixed UI calibration supports effective 1.5 CSS-to-recorded-pixel scale and origin (4,80). At CSS
1691x872 and DPR 1.5, the live reference logo has identical 179x37 bright bounds; navigation bounds
agree within one pixel. The PNG is 2537x1308 but its WebGL backing store is 2536x1308, so the
rightmost rounding/border needs explicit handling. Live reference is supplemental; the August
recording remains authoritative. Calibration files are under
`.reference-local/recovery-20260929/reference-scale-calibration.json`.

The default capture regression is not bit-exact: 108/120 frames match the previous candidate PNG
hashes, with sparse differences in 12 object-region frames. An unchanged-build repeat also differs
in 23/120 frames (maximum 1325/3317760 pixels, mean RGB error at most 0.000175/255, identical
displayed quaternion telemetry). This supports capture/render noise rather than a DPR behavior
change but does not prove bit-exact determinism. Keep the evidence limitation.

`aligned-opening-prefix` is 120 captured 1/120 simulation steps at the calibrated dimensions. Its
wall-region diagnostic still shows differences, but reference scroll/input timing is not aligned; do
not tune production colors to compensate for that mismatch.

The 57 top-boundary exceptions have been visually classified (Luna 53, primary 4): chrome is fixed;
animated content confuses the edge detector. Late taskbar visibility changes remain separate from
content bounds. Evidence: `crop-exceptions-visual.json`.

Next gates: finish the current blackout candidate's chronological visual review (its exit now has
a separately reviewed color-cut correction),
then continue isolated background/surface/Works improvements with aligned input history. Native
runtime recording/performance evidence and full desktop/mobile acceptance remain pending. No 100%
parity claim is justified yet.
