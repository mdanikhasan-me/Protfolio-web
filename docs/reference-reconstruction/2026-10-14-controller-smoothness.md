# Controller synchronization - October 14

The controller SVG was explicitly capped at 30 updates/second while the sculpture
rendered at the browser's cadence. Removed that cap in `quaternion-display.ts`;
unchanged orientations still produce no DOM redraw. No drag gain, geometry,
materials, fluid, resolution or animation quality changed in this factor.

Evidence root: `D:/Portfolio Evidence/controller-smoothness-20261013`.
Before source files are narrow rollback copies. `after-regression.json` passes
25 numerical scheduling cases, including each changed pose, final pose, idle and
reset. `build.log` passes Astro checking, lint and production build.

## Live diagnostic comparison

Both variants use the same current scripts except the old display-sync helper
and its delta argument. The isolated old variant runs on 4436; production was
never rolled back. The normal preview is 4421, current diagnostic 4435.
Diagnostic manifests now hash `src/lib` as well as scripts, use immutable build
IDs, and stamp each report. Observation records the expected model quaternion and
last quaternion actually sent to SVG drawing after each render update.

Evidence in `D:/Portfolio Evidence/performance-audit-20261013`:

| Report | Variant | Observed frames | SVG writes | Stale poses | Largest angular mismatch |
| --- | --- | ---: | ---: | ---: | ---: |
| `1791946169710-pacing.json` | Before | 913 | 3 | 7 | 58.95 degrees |
| `1791946058698-pacing.json` | Current | 990 | 8 | 0 | below 0.000002 degrees |

Five seconds each, 2040 x 974 CSS, DPR 1.25, normal motion. Same native browser
drag endpoints (1913,189) to (1935,243), identity starting pose and matching final
readout (0,0,-0.84,0.55). Input event delivery and frame counts are not identical;
this is a matched action comparison, not deterministic replay. Both medians
4.2ms / p95 8.4ms. No FPS improvement is claimed. The scheduling defect is fixed
and retained provisionally; full circular trajectories, pointer hover, native
presentation and reference parity remain open.

An earlier current-only run `1791945458903-pacing.json` collected 1195 intervals,
median 4.2ms / p95 4.3ms, maximum 12.4ms, zero intervals above 25ms and zero reported
long tasks. It is not a before/after speed comparison.
