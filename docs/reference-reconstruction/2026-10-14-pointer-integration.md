# Opening hover integration correction

The local integrator multiplied hover force by four, then multiplied both the
impulse and applied Euler by `seconds * 120`. The reference MainLogo consumes one
hover impulse per render, damps its Euler by `1 - deltaTime`, and applies it once.
Its Lerper advances the pointer residual after the scene update. The earlier
240-Hz calibration happened to approximate that one cadence but diverged at
slower cadences. This explains a concrete source of excessive spinning; it is
not a complete explanation of all reported controller smoothness issues.

Replaced only `advancePointerRotation` integration with the reference ordering,
force and damping. Kept caller return-to-rest, camera parallax, direct gizmo drag,
reset, top-only visibility and SVG pose synchronization unchanged. This follows
the reference's cadence-dependent integration intentionally. The earlier numerical
test that demanded equal strength across Hz was the wrong reference oracle; it
now checks the independently transcribed MainLogo/Lerper behavior.

Evidence: `D:/Portfolio Evidence/pointer-integration-20261014/`.
Rollback: `before-pointer-rotation.ts`. `comparison.json` contains 20 five-second
cases: sweep, circle, reversal and corner at 30/60/120/144/240 Hz. External return
is held equal to isolate hover. Before maximum angular discrepancy is roughly
1.77-178.55 degrees across cases; after is below 0.000005 degrees (quaternion
angle arithmetic tolerance). This compares numerical trajectories, not native
presentation or actual pointer event timing.

`regression.json`: all 20 ten-second cases pass (23,760 simulated frames), including
finite poses, per-frame agreement and settling. `build.log`: full build passes.
Protected GLB SHA-256 unchanged:
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.

Live Edge check: opening sweep (800,400) to (1150,520), then controller drag and
Reset. The short sweep gives a small tilt instead of the prior near flip. Direct
controller drag changes the readout to (0.50,0.05,0,0.86); Reset returns identity.
Reference and local screenshots are saved. Screenshot timing and viewport differ,
so these are interaction sanity checks, not a matched-frame or latency result.

October 15: caller return interpolation is corrected numerically in
`2026-10-15-pointer-return.md`; its fresh live check remains pending.
Remaining: true native circular input/presentation comparison;
full background/material/geometry parity and pacing.
No whole-site acceptance claimed.
