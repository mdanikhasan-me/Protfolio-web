# Footer corrections and evidence — October 12, 2026

Current decision: retain the measured corrections below. Complete footer and whole-site
pixel parity are **not accepted**. The wording and four ANIK glyph paths are preserved.

## What changed

- Horizontal and diagonal guides now follow the measured trim directions, easing,
  start times and shared fade. Removed the invented opacity/stagger behavior.
- The A uses the reference's one-second piecewise cubic movement. An actual fast-entry
  defect was found during the combined capture: a CSS transition could reverse an
  unfinished initialization transition and start from the wrong position. An explicit
  keyframe animation now defines its start and finish independently of arrival speed.
- Letter outlines draw during reference frames 37–55, then fill during frames 57–79.
  A rendered SVG defect was corrected: non-scaling strokes inside SVG use references
  prevented the normalized partial outline from appearing. The home glyph paths now
  carry the correct vector-effect attribute; interior footer behavior is retained.
- Replaced the approximate radial backdrop with the measured two-pass noise field.
  Live reference uses a 64×64 noise target and a 300×150 buffer at DPR 1, with aspect 1.
  At DPR 1.5 its buffer is 450×225. Both configurations are now verified against rendered
  reference pixels at aligned shader times. No viewport-sized render target is needed.
- The field loads near the footer, renders only when visible, suspends on page hiding,
  and resumes its page-relative color phase. Scrolling back does not restart the hue.

## Evidence and reproducibility

Root: `D:/Portfolio Evidence/current-20261011/footer-corrections/`.
Current combined sequence: `entry-fixed/`. Interactive viewer: `entry-fixed/index.html`.
Local viewer URL while its server runs: `http://127.0.0.1:8765/entry-fixed/`.
Preview: `http://127.0.0.1:4321/`.

Current dist/index.html SHA-256:
`1382c880c5eb75bc3b6a3b5aab7d7e2272b7514584e419a0fc70fdd7b11475f3`.

The original rejected sequence remains in `footer-full-validation/` alongside this
correction root. Individual before files, intermediate rejected outline captures,
and the fast-entry failure in `footer-corrections/final/` are retained. Despite its
folder name, `final/` is superseded by `entry-fixed/` and is **not accepted**.

| Check | Result | Scope |
| --- | --- | --- |
| Build | Passed | Astro 56 files, zero errors/warnings/hints; ESLint; 23 pages, 21 indexed |
| Functional behavior | 50/50 | Desktop, reduced motion, mobile, short viewport and interior footer |
| Entry regression | 9/9 | Immediate, 150 ms and 1500 ms arrival; three entries each; six trajectory samples per entry |
| Full viewport sequence | 119 pairs / 238 PNGs | All decode and hash; 118 adjacent pairs present |
| Maximum A center difference | 0.031494 CSS px | All 119 controlled states; reference SVG box versus local rendered box |
| Maximum vertical endpoint difference | 0.486512 CSS px | Visible endpoint, fixed x, all 119 states |
| Maximum guide fade difference | 0.000009334 | Opacity, all 119 states |
| Maximum outline progress difference | 0.000004334 | Normalized progress against reference authored timing |
| Maximum fill opacity difference | 0.000002845 | Measured reference layer opacity, all 119 states |
| Background framebuffer comparison | 119/119 identical at DPR 1; 119/119 at DPR 1.5 | Zero changed RGBA pixels at aligned time and visibility; background only |
| Runtime lifecycle | 7/7 | Visible motion, offscreen stop, phase continuity, pagehide/pageshow, no DOM churn/errors |

Reference source: live `https://alche.studio/`, retained source and Lottie asset in
`footer-reference-match/`. Asset rate 29.9700012207031 fps; states 0–118; time is
100 ms plus frame time. Background comparison uses shader time 10 seconds plus
frame time. These are controlled replay inputs, not native display frame capture.

The runtime sample on this build recorded 480 real-time headless RAF intervals over
two seconds, p50 4.2 ms and p95 4.3 ms, 131.115 ms total page task time and 51.553 ms
script time. Footer mutations, layout duration and style recalculation were zero.
Offscreen draw count stayed at 1674 during the one-second observation. This is not
proof of native FPS, GPU frame duration or performance on another device.

Four comparison pairs (22, 45, 65, 92) were individually visually reviewed. All 119
pairs have machine measurements; do not describe four reviewed pairs as complete
individual visual review. Visible Edge checks cover the completed footer and upward
scrolling. Native screenshots are supplemental; no native continuous recording yet.

Protected identity GLB verified unchanged:
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
Four glyph path strings match the before file. No text rewrite, push or deployment.

## Remaining gates

1. Complete chronological visual review and native continuous entry/reverse/exit capture.
2. Compare the footer link layout and scroll transition at matched viewport/input states.
3. Full composited geometry/edge validation: matching animation timing and background
   pixels does not establish identical lettering, antialiasing or every guide position.
4. Native display performance and context-loss recovery remain unverified. Existing
   large-bundle and mixed dynamic/static import build warnings remain separate work.
5. Continue the whole-site audit after this bounded footer correction; opening object,
   Works reflection, lower sections and other routes are not accepted by this report.

Diagnostics are in `.codex-local/maintenance-20261009/` at the parent workspace:
`validate-footer-sequence.mjs`, `check-footer-entry.mjs`, `check-footer-outro.mjs`,
`compare-footer-field.mjs`, `profile-footer-field.mjs`, and `summarize-footer.py`.
They are not production dependencies. Preserve all failed runs and narrow rollback files.
