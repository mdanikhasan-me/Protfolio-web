# Return-home background cut: candidate decision

Single factor: monochrome panel blackout release at native reference picture 17,578. Source changed:
`src/scripts/reference-background-system.ts`. Rollback: remove only `homeBlackoutRelease` and
restore the prior conditional recorded in
`.reference-local/recovery-20260929/source-before/background-blackout-before.ts`.

## Evidence and change

The calibrated 120-picture reference/current window is pictures 17,541-17,660. Every native
reference image and every corresponding current PNG was decoded and measured, including all 119
adjacent transitions. The recording changes panel illumination at 17,578; the current scheduler has
no corresponding event. Primary visually inspected the native 17,576-17,579 boundary, as well as the
corresponding candidate boundary.

A forced next-quadtree experiment worsened upper-left pixel error from 25.01 to 33.88/255 and was
rejected without changing production layout. The next hypothesis was a blackout release: expose the
already-authored panel pattern on that frame, preserving panel geometry.

The candidate sets blackout rate to zero only during `[17578, 17682)`. The existing next layout
boundary at 17,682 restores the prior schedule. No crossfade, brightness gain, new geometry,
font/brand removal, or reduced motion shortcut was added.

## Measured result

| Measure                                   | Baseline | Candidate | Reference     |
| ----------------------------------------- | -------- | --------- | ------------- |
| Lower-left wall pixel MAE after cut       | 25.015   | 22.197    | Target pixels |
| Upper-left wall pixel MAE after cut       | 25.010   | 24.682    | Target pixels |
| Upper-right wall pixel MAE after cut      | 20.431   | 20.431    | Target pixels |
| Lower-left mean luminance over 120 frames | 12.326   | 18.165    | 18.246        |
| Whole-frame change at picture 17,578      | 0.110    | 4.086     | 10.831        |

The first 37 candidate pictures (17,541-17,577) are byte-identical in decoded RGB to the baseline.
Improvement is local: lower-left post-cut error is 11.26% lower; upper-left is 1.31% lower;
upper-right is unchanged. The cut now exists at the correct frame, but its spatial distribution and
amplitude still do not fully match the reference.

`npm run build` passes; the protected identity GLB hash is unchanged. Normal motion, reduced-motion
rules, ANIK word assets, project rail, shaders for the object, and user content were not changed in
this experiment.

## Decision boundary

Measured local improvement; retain provisionally while the full candidate visual ledger and
exit-boundary check finish. This is not full-site, surface, or background acceptance. The object
pose/input history still differs from the recording. The capture is a simulated 1/120 replay, not
proof of native 120-fps runtime output.

Evidence root: `C:\Users\anikh\.codex\scratch\portfolio-recovery-20260929`. Baseline:
`home-17541-17660`; rejected layout test: `home-layout-2-v3`; candidate: `home-blackout-release`;
exit check: `blackout-exit-17661-17690`. Reports:
`.reference-local/recovery-20260929/home-blackout-comparison.json` and
`blackout-all-frame-scores.json`.

Exit follow-up: the p17,680-17,703 window revealed a separate incorrect color-pattern entry at
p17,682. Its isolated correction and complete 24-picture review are recorded in
[the color-cut decision](2026-09-29-color-pattern.md). The original 120-picture blackout candidate
still needs its remaining individual visual review; this follow-up does not close that gate.
