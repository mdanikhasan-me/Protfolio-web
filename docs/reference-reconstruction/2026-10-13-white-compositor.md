# White-scene pointer correction — October 13

## Scope and decision

Retain one correction: sample the complete white WebGL scene with the reference's
negative fluid displacement. Previously only the background grid moved with a
positive displacement; the outline and colored edge stayed rigid. Preserve the
existing geometry, content, palette and scroll composition in this chunk.

The reference mixer uses `uv - fluid.xy * .01`, following a final-composite
sample at `uv - fluid.xy * .001`. The new pass applies both samples to the white
scene. This does not yet reproduce reference bloom, brightness modulation or the
Service-dependent late-white regime. Those remain OPEN; no full parity claim.

## Implementation and efficiency

- Full drawing-buffer resolution and the canvas's actual MSAA sample count.
- Unsigned-byte color target; no new color-space conversion or tone mapping.
- Target allocation and program compilation happen before the chapter is visible.
- Before any fluid disturbance, retain direct rendering with no extra copy.
- After disturbance, preserve the entire fluid decay; do not prematurely stop it.
- Depth is retained for drawing the sculpture but is not resolved/copied because
  the compositor only reads color. All added GPU resources are disposed.

## Evidence

Root: `D:/Portfolio Evidence/white-compositor-20261013`.
Rollback: `before-light-chapters.ts`, `before-reference-fluid.ts`.
The isolated fixture is `.codex-local/white-compositor-check.mjs`; it bundles the
actual source and fixes time/scroll/input only for the comparison. It checks
nonblank, opaque rendered pixels before accepting a comparison. It explicitly
draws the controlled test while hidden; normal production visibility behavior is
unchanged. Earlier exploratory reports without that guard are not final evidence.

- Final source SHA-256 at this gate:
  `6a542218a3b4945dbab51e622cb7cb82e0a09a643878e27df0eacd8c529de4d2`.
- `rest-transfer-report.json`: four same-frame poses at 2040×969, DPR 1,
  4 samples. Direct and copied output match exactly in all four: zero changed
  pixels, zero maximum channel error; 1,976,760 opaque baseline pixels per pose.
  These are local transfer comparisons, not reference/native-frame acceptance.
- Earlier candidate with depth resolve: three exact poses; one pose had one
  pixel differing by one channel value. Preserve `after-rest-interpolated-2040x969.json`.
- `gpu-with-depth-resolve.json`: 30 samples per path, direct median 0.898 ms,
  compositor median 4.244 ms, compositor p95 5.876 ms.
- `gpu-report.json`: depth resolve removed; 30 valid samples per path, direct
  median 0.889 ms, compositor median 2.863 ms, compositor p95 4.317 ms. No GPU
  disjoint samples. This is about 32.5% less GPU time than the initial compositor,
  but still adds about 1.97 ms over direct rendering in this isolated test.
  It is not a whole-page FPS, CPU, memory or cold-entry performance result.
- `before-live-vision.png`, `after-live-vision-rest.png`,
  `after-live-vision-pointer.png`: actual Edge page captures. The pointer capture
  visibly bends the outline and colored edge together with the grid. It includes
  a text selection caused by the drag used for the check; that is not new styling.
- `after-live-pointer.png` was accidentally captured at the opening after reload
  reset scroll; it is NOT white-scene proof.

Protected identity GLB hash remains
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.

## Remaining work

Match brightness and the two white response regimes against aligned reference
trajectories, correct white camera/grid/palette separately, and validate cold entry
and full native frame pacing. Controller endpoint/ring verification also remains
open: reference axis input was observed changing, but a stable matched endpoint
was not established. Do not mark the controller accepted from source math alone.
All other backlog rows in the October 12 feedback ledger remain active.
