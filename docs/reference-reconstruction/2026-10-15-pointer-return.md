# Opening return-to-rest correction

The remaining opening return used a 120-Hz exponential conversion. The saved
reference MainLogo.update instead calls quaternion.slerp with deltaTime times
returnToOriginForce. The two agree at 120 Hz but diverge at other cadences.

Changed only pointerBlend to clamp(seconds * rate, 0, 1). Direct gizmo input,
drag ownership, Reset, hover impulse, camera and visual settings are unchanged.
The independent regression now compares the combined hover and return against
the reference formula instead of applying the same production return helper to
both sides. Before the fix it fails at 30-Hz sweep frame 3. After the fix all
20 trajectories pass, covering 23,760 simulated frames at 30/60/120/144/240 Hz.

Evidence and narrow rollback: `D:/Portfolio Evidence/pointer-return-20261015/`.
`before-pointer-rotation.ts`, `before-verify-pointer-timing.mjs`, `before-test.log`
and `after-test.json` preserve the experiment. The reference source is the saved
`footer-reference-match/reference-page.js`, SHA-256
`b2bd0d964416bd3db61b1392d2b645314e50ea79cadb09f69755d5f4c3791853`.

Status: numerical correction retained provisionally. This is not rendered or
native circular-input acceptance. Browser execution tools were removed from the
available tool inventory during continuation, so a fresh live check is pending.
No claim of improved FPS, complete controller smoothness or whole-site parity.

Validation: full production build exited 0; typecheck reports 63 files and zero
errors/warnings/hints, lint passes. `git diff --check` passes. Maximum numerical
angular error is 8.43e-8 radians. Protected GLB SHA-256 remains
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
