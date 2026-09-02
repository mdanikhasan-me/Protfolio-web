# Recovery and controller validation, 2026-09-29

Starting commit: `e82582faafb1a2b33d3ad73a5dea03a735b381b2`. Changes remain local and uncommitted.
The protected GLB hash is unchanged.

## Changes

1. ESLint and Prettier now ignore local evidence, temporary work, and browser profiles in
   `.codex-local`, `.codex-reference-analysis`, and `.codex-tmp`. Prettier also ignores
   `.reference-local`. Initial lint scanned archived third-party bundles and failed with 16,952
   errors. Application lint still runs.
2. Production assets are emitted as same-origin files instead of inline data URLs. This resolves six
   font CSP errors without weakening `font-src 'self'` or changing fonts.
3. A captured controller drag pauses return-to-rest. It previously decayed the orientation while the
   mouse remained held at an unchanged position. Release retains the existing return.
4. Added a reproducible capture/audit path and durable recovery rules. The historical evidence is
   preserved, including failed captures. No colors, geometry, material, typography assets,
   background timing, project content, or scroll choreography were redesigned.
5. Added an explicit capture pixel-ratio option (1-1.5; historical default remains 1), with separate
   CSS/backing dimensions. Regular runtime sizing is unchanged. Bounded ranges replay every
   preceding simulation step; unsaved warm-up steps are never counted as captured or reviewed
   pictures.

## Source and runtime checks

- `npm run build`: passes typecheck, lint, Astro build, and Pagefind. 23 pages built; 21 search
  pages indexed. The existing large-chunk warning remains.
- `git diff --check`: passes.
- Capture harness ESLint and Python syntax checks: pass.
- Audit rejection checks: valid hold passes; corrupt PNG hash, wrong time index, held-pose drift,
  and browser errors are rejected.
- Current build loads the model and all four gallery textures with no JavaScript errors.
- Clean controller captures have no console errors or failed network requests. Chrome still warns
  that `frame-ancestors` is ignored in a meta CSP; it is recorded.
- Real wheel input reaches Boilabin, SoctuKit, UIU Discord Bot, and Salty Potato AI. This is a
  functional smoke test, not all-frame Works acceptance.

## Ordered controller evidence

Capture root: `C:\Users\anikh\.codex\scratch\portfolio-recovery-20260929`. Reports:
`.reference-local/recovery-20260929`.

| Measure                                    | Clean baseline  | Candidate       | Reduced-motion candidate |
| ------------------------------------------ | --------------- | --------------- | ------------------------ |
| Expected / captured / fully decoded PNGs   | 120 / 120 / 120 | 120 / 120 / 120 | 120 / 120 / 120          |
| PNG hash mismatches                        | 0               | 0               | 0                        |
| Adjacent image transitions measured        | 119             | 119             | 119                      |
| Held steps, p2 through p90                 | 89              | 89              | 89                       |
| Steps differing from first held quaternion | 88              | 0               | 0                        |
| Return toward rest after p91 release       | Yes             | Yes             | Yes                      |
| Held-pose regression gate                  | Failed          | Passed          | Passed                   |

The baseline and candidate's first decoded RGB frame are byte-identical. Their background, fluid,
scroll source, and GLB hashes are identical. Only the tested controller source and resulting built
output differ among the recorded rendering source hashes.

These runs use ordered **simulated 1/120-second renderer steps** at 2560 x 1296. Each image has a
filename, SHA-256, capture clock, simulated time, input/drag state, and displayed quaternion. All
images were fully decoded in the audit and given decoded RGB hashes. Quaternion telemetry is rounded
to two decimal places. This is not source-video pixel equivalence, native 120-fps recording, or a
full reference-parity result.

A separate actual-input runtime test records 240 RAF callbacks while held and 240 after release. The
held quaternion remains `-0.17 0.23 0.00 0.96` throughout, then returns toward identity after
release. This independently exercises the regular animation loop; it captures telemetry, not a
native video.

The failed earlier `controller-before.partial` run remains preserved with its CSP errors. Use
`controller-baseline`, `controller-after`, and `controller-reduced` for clean evidence.

All 120 normal candidate pictures have now been individually visually inspected at original
resolution in chronological batches of four: Luna inspected 1-80, then the primary agent inspected
81-120 after Luna hit its usage limit (primary also viewed 1-4). The object remains visible, the
held pose remains stable, and return resumes after release. No transient whole-scene flash or
disappearance was observed in this test. Broad clipped white highlights remain throughout; surface
fidelity is not accepted. The primary completed the durable hash-linked ledger from those reviews at
`.reference-local/recovery-20260929/controller-candidate-visual-ledger.csv`. The reduced-motion
replay is machine-audited, not individually visually reviewed.

## Performance boundary

A 240-interval headless RAF probe at 2560 x 1296 used the RTX 3070 through ANGLE/D3D11: mean 4.1675
ms, p95 4.30 ms, maximum 4.30 ms. It records browser callback cadence only. It does **not**
establish GPU execution time, on-screen delivered FPS, native capture rate, CPU cost, VRAM use, or
long-run stability. No performance improvement is claimed from it.

## Remaining acceptance gates

- Correct viewport alignment: an all-frame boundary diagnostic decoded 32,607/32,607 native frames
  without resizing in 166.57 seconds. The strongest top edge was row 80 in 32,550 frames; 57
  selected other edges and need classification. Bottom detections were row 1388 in 28,282 frames and
  row 1392 in 4,325. This disproves the historical row-64 crop as an exact viewport. Before final
  pixel comparison, finish horizontal bounds, overlays, and CSS/device-pixel calibration. The
  diagnostic is not whole-frame visual review.
- Complete aligned current-build reference comparison for background, surface, typography, project
  wall, rail motion, transitions, and pointer interactions.
- Verified native-rate runtime capture and full resource/stability profiling.
- Desktop acceptance, followed by mobile acceptance.

The controller test establishes a narrow behavioral correction. It does not accept the current glass
appearance, bloom, background palette, or complete website as a 100% match.

Boundary ledger and report:
`C:\Users\anikh\.codex\scratch\portfolio-recovery-20260929\reference-crop-audit`. The original full
native corpus and historical analysis remain untouched.

## Reproduction

The calibrated setup uses CSS 1691x872 / DPR 1.5 and reference origin (4,80). Fixed logo bright
bounds agree at 179x37 pixels, and navigation bounds agree within one pixel. This supports spatial
scale, not temporal/input alignment or animation acceptance. PNG width 2537 versus backing width
2536 is disclosed; the diagnostic compares the common 2536-wide region without resampling.

The default capture path retains identical rounded quaternion telemetry. 108/120 PNGs match the
prior candidate byte for byte; an unchanged-build repeat differs in 23/120 frames, with no more than
1325 changed pixels and 0.000175/255 whole-frame mean RGB error. Exact bit repeatability is not
established. The baseline/candidate hashes and repeat control remain available; no differences were
silently discarded.

Invalid requested ratios (0, 2, and text) fall back to 1. A valid 1.5 request returns a 2536x1308
backing canvas and 13,268,352 RGBA bytes. The dimension/buffer tests pass. Reports:
`capture-scale-validation.json`, `default-dpr-regression.json`, and `dpr-repeat-control.json` in the
local report directory.

The 57 crop exceptions are now reviewed: 53 by Luna, 4 by primary. Top browser chrome remains fixed;
moving content confused the strongest-edge detector. Late frames omit the visible taskbar, whose
cause remains unestablished. This is boundary classification, not a complete new visual review of
the reference.

Use the isolated Playwright module already present locally, an installed Chrome binary, and the
production preview at `http://127.0.0.1:4321/`. No browser package was added to the app.

```powershell
node scripts/validation/capture-controller.mjs `
  --playwright=.codex-local/a-rebuild-review/browser-tools/node_modules/playwright-core/index.mjs `
  '--browser=C:/Program Files/Google/Chrome/Application/chrome.exe' `
  --output=C:/Users/anikh/.codex/scratch/portfolio-recovery-20260929/new-controller-run

python scripts/validation/audit-controller.py `
  C:/Users/anikh/.codex/scratch/portfolio-recovery-20260929/new-controller-run `
  --output=.reference-local/recovery-20260929/new-controller-audit.json `
  --require-held-pose
```

Use a new output directory/report for every run. Add `--reduced=true` to capture the reduced-motion
case. The harness rejects browser errors and never labels a PNG count as native-rate integrity or
full parity acceptance.
