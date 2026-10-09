# Pointer response, October 9

The owner reported a slow, unresponsive sculpture and worse overall smoothness than
the reference. Connected Edge confirmed Windows reduced motion is active. This is
not an excuse for poor response: direct manipulation must remain usable in that mode.

## Retained changes

1. Removed the 0.35 multiplier on opening pointer input. The automatic startup
   distortion still stays off under reduced motion. Windows settings are unchanged.
2. Made the pointer impulse, accumulated rotation, filter, and return damping
   depend on elapsed time, calibrated to the existing 120 Hz replay. Previously
   both impulse accumulation and quaternion integration ran once per frame without
   time scaling. That made movement much weaker on lower-refresh displays.

`src/lib/pointer-rotation.ts` contains the input integration. No geometry,
resolution, render target, shader, texture, bloom, background timer, or scroll
easing was changed. The protected GLB hash still matches the master state.

The same half-second horizontal sweep in the numerical model previously peaked
at 10.20 degrees at 60 Hz, 41.45 at 120 Hz, and 167.08 at 240 Hz (full gain).
The production helper now peaks at 42.70, 41.45, and 40.82 degrees respectively.
30 Hz reaches 45.19 degrees; 144 Hz reaches 41.24. Tests also require a prompt
initial response, finite orientation, and settling after input stops. These are
numerical response checks, not measured input-to-photon latency or native FPS.

Run: `node scripts/validation/verify-pointer-timing.mjs`.

## Rendered and interaction evidence

Evidence root: `D:/Portfolio Evidence/current-20261009/`.

- `pointer-before/`, `pointer-full-gain/`, `pointer-timed-after/`: ordered simulated
  120 Hz input, 240 steps per motion preference, with screenshots at steps
  24, 36, 60, 84, 120, and 240. One factor was changed and checked at a time.
  Quaternion response matches between normal and reduced motion after the fix.
- `pointer-pixel-check.json`: all six normal-mode screenshots match the before
  build pixel for pixel; all six after screenshots match across motion preferences.
  This is six checked frames, not an all-frame visual acceptance.
- The first two reports' `pixelHash` fields came from a cleared default framebuffer
  after a screenshot and are invalid as visual evidence. Use the saved PNGs and
  `pointer-pixel-check.json`; the final report hashes the saved PNG instead.
- `scroll-response-after/`: eight native-scroll regressions pass, zero errors.
  The harness's stepped autoscroll input remains a simulation.
- Connected Edge, with the owner's reduced-motion setting still active: the local
  page rendered; a horizontal pointer sweep turned the A; the readout changed from
  identity to `0.00 0.20 0.00 0.98`, and the tilted material was visually inspected.

Narrow rollback source and diagnostic harnesses live in
`P:/Projects/Protfolio/.codex-local/maintenance-20261009/`.
`opening-response-before.ts` is the untouched source before both input changes.

## Performance boundaries

`response-before/` and `response-edge-before/` compare the portfolio with
`https://alche.studio/` using the same 1912 by 948 viewport, DPR 1, reduced motion,
D3D11, and pointer path in separate headed Chrome/Edge test sessions.
`response-edge-after/` repeats the portfolio after the fix.

Edge callback interval p95 stayed 4.3 ms before and after. Callback CPU p95 stayed
0.6 ms. The reference run varied more, so these short runs do not reproduce the
reported large frame-pacing gap. They neither disprove the owner's experience nor
establish displayed FPS, GPU completion, or motion quality equivalence. The actual
connected user tab was inspected, but these timings are from fresh test sessions.
No FPS improvement is claimed from the input correction.

The build passed: 53 checked files, no type errors/warnings/hints, ESLint passed,
23 pages built. Existing Vite chunk/import warnings remain. Keep the response fix;
overall performance acceptance, material matching, and full reference parity remain open.
