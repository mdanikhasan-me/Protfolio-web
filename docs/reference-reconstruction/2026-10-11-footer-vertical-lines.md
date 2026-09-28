# Vertical line correction, October 11

The user rejected the new footer, then clarified: **the vertical animations are
not close to the reference**. Scope this pass to vertical lines. Do not reinterpret
that clarification as permission to change letter spacing or layout again.

## What was wrong

The previous implementation invented sideways convergence, per-line staggering,
and a long low-opacity fade. Its functional tests proved that it ran and fit the
viewport; they did not prove that it reproduced reference motion.

Read all 12 `tate` tracks in the saved reference outro JSON, including the shape
vertices, layer transform, path trim, easing, stroke and opacity tracks:

- Every vertical stays at a fixed x. There is no sideways travel or stagger.
- The path draws downward. Trim end goes 0 to 100% over frames 0..22, easing
  cubic-bezier(.333,0,.667,1). The controller starts the asset 100ms after entrance.
- Paths extend well beyond the visible screen. Trimming only a viewport-height
  line changes when the visible drawing enters/exits, even with the same easing.
- The authored line is 0.5 source units wide, RGB approximately 145,145,145. It
  scales with the reference SVG, unlike the previous fixed .65px non-scaling line.
- Opacity is 100% through frame 72, 50% at 78, zero at 92, linear between keys.
  The 58 key is also 100%; it does not begin a fade. Asset rate: 29.970001 fps.

The local implementation now uses those trim/fade timings and offscreen path
length. Positions remain tied to ANIK geometry. Removed the invented vertical
through the A's center; the reference A has only outside vertical boundaries.
This leaves 11 ANIK verticals versus the reference's 12 for its different word.
Horizontal/diagonal guides, letters, layout and backdrop are unchanged this pass.
Reduced motion retains stationary faint lines as previously required.

## Evidence and rollback

Evidence: `D:\Portfolio Evidence\current-20261011\footer-vertical-v2`.
Narrow before-source copies: `FooterBrand-before.astro`, `studio-footer-before.css`.
Before images: `before-300.png`, `before-800.png`. Restore only those two source
files to reverse this experiment. Keep unrelated work and the original corpus.

`compare-footer-verticals.mjs` exposes the reference's own Lottie controller only
inside an isolated diagnostic browser. It seeks all 119 authored asset frames,
records the rendered vertical paths, then seeks local CSS animations to matching
times. Reference script/assets are not added to production. This is deterministic
asset-frame comparison, **not** native chronological video capture or display FPS.
Different letter x positions and the reference sound overlay are excluded.

## Validation and decision

Current build SHA-256 (`dist/index.html`):
`77d48a4603d5eeeeb5bc9339d14f008dba3270ed9ace84faaa0f8684b38af861`.

- Production build passed: Astro 55 files, zero diagnostics; ESLint passed;
  23 pages built, 21 indexed. Existing Vite warnings remain.
- Final comparison run: 2026-10-11T09:19:28.581Z, isolated headless Edge,
  1691 x 872 CSS pixels, DPR 1. Recorded 119 reference asset states and 119
  local CSS states. This compares line attributes, not complete image pixels.
- Visible vertical drawing endpoint maximum difference: 0.48652 CSS px.
  Opacity maximum difference: 0.00000934. Width maximum difference:
  0.00001641 CSS px. X positions intentionally follow different ANIK lettering.
- Visually inspected four pairs (8 images): frames 9, 11, 13, 78 from the final
  run. These show the downward sweep and fading lines; remaining captured sample
  images have not received a new individual review. No full-frame acceptance.
- Functional checks passed 50/50 across desktop, reduced motion, mobile, short
  desktop and inner-page footer. These are regression checks, not parity proof.
- Natural animation/idle diagnostic passed: in the settled two-second interval,
  zero footer DOM mutations, running animations, layout or style recalculations.
  Whole-page entrance had 167 layouts and 884 style recalculations; no claim of
  optimized native FPS, GPU cost or complete performance acceptance.

The comparison harness initially sampled the wrong unpainted Lottie fill path
and captured the loading overlay. Those runs are invalid and superseded. Final
capture waits for `body[data-phase=ready]`, loading overlay `data-hidden` with
computed opacity zero, and the outro screen at viewport top; it selects the
actual stroked path. A zero-length `M0 0` path is treated as invisible.

Decision: retain this narrow vertical-track correction provisionally. The footer
as a whole is still rejected/unaccepted. The A transition is not deterministically
controlled by this harness; do not infer its timing from these images. Horizontal
and diagonal tracks, outline/fill, backdrop and complete transition timing still
need their own reference measurements, followed by native chronological evidence.
The latest user explicitly rejected invented designs and effects. Do not add new
styling to compensate for these remaining differences. No commit or deployment.
