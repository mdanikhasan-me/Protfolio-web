# Pointer response and performance - October 13

## User requirements

- Pointer response is improved but still feels heavier/slower and over-bloomed.
- Reference feels immediate and lightweight, including under actual PC load.
- Improve efficiency without reducing resolution, visual quality, animation,
  effects or using reduced motion as a performance workaround.
- Preserve the contact illustration and approved footer appearance.

## Source findings, not measured performance conclusions

Reference bundle: `D:/Portfolio Evidence/current-20261011/footer-reference-match/reference-page.js`.
Evidence: `D:/Portfolio Evidence/performance-audit-20261013/reference-excerpts.json`.

1. Reference StableFluids advances advection, curl force and 0.99 velocity retention
   once per render. Local ReferenceFluid multiplies advection/curl by dt*60 and
   raises retention to that power. At 120 rendered frames/second the local
   advection coefficient is 0.5 versus reference 1. Scalar retention half-life is
   1.149s versus 0.575s. This can explain a longer/heavier trail; it is NOT proof
   of actual fluid behavior or a measured FPS result. At 60Hz coefficients agree.
   Numerical recurrence at 30/60/120/144/240Hz: `cadence-source-analysis.json`.
2. Reference RenderPipeline cascades bloom: bright -> quarter vertical/horizontal
   -> eighth -> sixteenth. Local code starts each level from bright. Its comment
   claiming the reference uses independent levels contradicts the saved bundle.
   Threshold 0.9, 3 blur weights and accumulation weights otherwise agree. The
   correction must be tested with matched pointer input before visual acceptance.
3. Input position (10/s) and velocity (20/s) smoothing rates already match the
   reference Lerper. Increasing those arbitrarily would obscure the actual cause.
4. Opening currently has full-resolution scene, refraction copy, mixer and bright
   extraction, followed by three blur pairs and final composition. Counting passes
   alone does not establish cost; the reference also uses several post-processes.
5. Opening/white/footer renderers already gate offscreen work. White whole-scene
   displacement adds a full-resolution MSAA target/copy after first interaction.
   Earlier isolated GPU measurements exist in the white compositor log, but they
   cannot be treated as current whole-page timings.

## Prepared measurements

Local-only diagnostic preview: `http://127.0.0.1:4435/` (updated October 14).
Start from repo root: `node .codex-local/profile-render-passes.mjs`.
This bundles the current homepage scripts with renderer instrumentation injected
only into the diagnostic build. Production source/settings remain unchanged.
Manifest records source, built bundle and HTML SHA-256 values. Reports write only
to the local SSD evidence directory. No production profiler dependency is added.

Two separate five-second runs:

- Pacing: RAF interval distribution and long tasks, no GPU queries/per-pass timing.
- GPU: every eighth RAF samples renderer calls using asynchronous disjoint timer
  queries, separate CPU submission duration, scene/material, target dimensions,
  scroll position, draw calls and triangles. Disjoint, unresolved and unsupported
  results are explicit. Hidden-page recordings are invalid.

Scenarios: opening rest and pointer sweep; Works scroll and pointer sweep; both
white regimes; first and repeat footer entry. Pair with native browser performance
recordings and aligned screenshots. CPU submission time is not GPU elapsed time;
instrumented pacing is not the uninstrumented baseline.

Historical October 13 preparation: `candidate-fluid-cadence.patch` and `candidate-bloom-cascade.patch` were independent
experiments saved outside production. Both were subsequently implemented with the
bounded October 14 checks in `2026-10-14-fluid-bloom.md`. Final acceptance requires stationary
quality preservation, chronological pointer trails, all transition frames and
before/after performance for the same viewport/input/build conditions.

## October 14 live measurements

Edge reconnected. At 2040 x 974 CSS / DPR 1.25, opening-rest pacing recorded
1163 intervals in five seconds, median 4.2ms / p95 4.3ms
(`1791945348061-pacing.json`). Separate opening GPU report
`1791945383448-gpu.json`: base scene median 0.185ms, identity 0.115ms,
post 0.060ms, mixer 0.054ms; 146 samples for those passes, no disjoint queries.

Works report `1791945700675-gpu.json`: 1194 intervals, median 4.2ms / p95
4.3ms. Base scene median 0.236ms / p95 2.657ms; long-tail GPU cost merits further
measurement. White entry `1791945743028-gpu.json` still had a visible opening
strip and both renderers. Fully covered `1791945781276-gpu.json` had only the
white renderer, confirming the opening visibility gate works.

White pointer report `1791945838521-gpu.json`: 1125 intervals, median 4.2ms /
p95 8.3ms; full-size scene target median 1.563ms / p95 2.437ms, composite
median 0.080ms. The target/resolve path is substantially more expensive than
opening passes. This identifies work to investigate, not an optimization already
made. No resolution, sample count or effect has been reduced.

Controller cap removal and paired browser evidence are recorded in
`2026-10-14-controller-smoothness.md`. It fixes stale display poses, not GPU cost.
All these runs are diagnostic: pacing has no GPU queries but uses an instrumented
bundle. CPU submission timers often quantize to zero, not proof of zero CPU cost.
Native presentation, memory/VRAM, cold footer entry and full parity remain open.
Older October 13 runs with repeated ~1000ms intervals are not usable normal FPS
baselines; their cause was not established. Retain them without a speed claim.

## Latest capture review, October 15 continuation

These captures precede the October 15 return-interpolation correction. They do
not constitute a matched before/after performance comparison.

- `1791975547936-pacing.json`: current opening rest, 226 intervals,
  median 20.9 ms / p95 33.4 ms.
- `1791975888795-pacing.json`: fresh opening run with two pointer drag sweeps,
  233 intervals, median 20.8 ms / p95 33.4 ms, max 37.6 ms.
- `1791975602320-gpu.json`: separate GPU-instrumented opening run, base scene
  median 0.272 ms, identity 0.168 ms, post 0.096 ms, mixer 0.066 ms.
  No disjoint or unresolved queries. Do not sum independent pass medians into
  an asserted whole-frame GPU time.
- `1791975970340-cpu.json`: separate diagnostic callback-timing mode,
  197 callback-bearing frames, total callback CPU median 0.4 ms / p95 0.7 ms /
  max 2 ms. RAF intervals median 33.3 ms / p95 33.4 ms; no observed long tasks.
  This measures JavaScript RAF callbacks, not browser painting/compositing,
  every event handler or total main-thread cost. Instrumentation has overhead.
- Exclude `1791975689239-pacing.json` from normal timing conclusions: the run
  named active-sweeps was interrupted before input, with p95 1000.2 ms.
  Its automatic invalid flag was null; that flag does not establish validity.

The mismatch between short callback/GPU work and long RAF intervals is unresolved.
Earlier 4.2-ms intervals are not a comparable current baseline. A lightweight
animated control page was prepared at diagnostic port 4451 `/__pacing-control`
to help distinguish browser scheduling from scene cost, but no control result
was captured before browser execution tools disappeared from this session.
Do not report it as tested, attribute the pacing problem to the browser, or
claim a whole-site speed gain. Production quality and motion settings remain.

## Earlier interruption (superseded)

Diagnostic build compiled and served HTTP 200, production preview also HTTP 200.
At that point no GPU/pacing samples existed: the browser inventory became empty, and the
native computer tool could not connect. No massive-performance-improvement claim
is justified. Next work is actual measurements and contact visual validation once
browser control reconnects, not another speculative quality reduction.
