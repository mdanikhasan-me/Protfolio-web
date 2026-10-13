# Pointer cadence and bloom correction — October 14

Three separate factors were tested and retained provisionally. None is a
whole-site acceptance or a measured FPS improvement.

## Fluid cadence

The saved reference StableFluids implementation advances advection, curl and
velocity attenuation once per render. Local code scaled these terms by elapsed
time relative to 60 Hz, while queuing pointer impulses once per render. This made
the high-refresh wake behave differently. `reference-fluid.ts` now uses a factor
of 1 for those solver terms. Pointer smoothing, gain, field resolution, pressure
iterations and texture format are unchanged.

Evidence: `D:/Portfolio Evidence/fluid-cadence-20261014/` includes the before
source, exact extracted reference shaders, fixture source, per-frame comparison
JSON and build log. The controlled half-float test covers 1,260 chronological
simulated frames across 1920x1080 and 800x1000 at 60, 120 and 240 Hz. Each sequence
has half a second of input and one second of decay. Nonzero reference energy and
finite channels are checked. Both variants share input and target format.

| Size / rate | Before mean RG error | After mean RG error |
| --- | ---: | ---: |
| 1920x1080 / 60 | 0.0000042803 | 0.0000042803 |
| 1920x1080 / 120 | 0.0008301723 | 0.0000038145 |
| 1920x1080 / 240 | 0.0008615675 | 0.0000099789 |
| 800x1000 / 60 | 0.0000020782 | 0.0000020782 |
| 800x1000 / 120 | 0.0004462644 | 0.0000023498 |
| 800x1000 / 240 | 0.0004696137 | 0.0000035209 |

The reference uses FloatType on desktop, whereas local fluid uses HalfFloatType.
A separate desktop-float reference run in `desktop-float/comparison.json` covers
630 more simulated frames. Mean error improves from 0.0008210598 to 0.0000866006
at 120 Hz and from 0.0008499070 to 0.0000654481 at 240 Hz (89.5% and 92.3%).
60 Hz is unchanged. Precision and GLSL arithmetic differences remain; do not
describe the fluid as pixel-exact. The fixture reuses the local pass scheduler
and input conversion with independently extracted reference fragment shaders;
it does not verify the complete reference application's event delivery.

## Bloom cascade

The reference passes each horizontal blur into the next vertical blur. Local
code restarted all three levels from the threshold image. Corrected only this
texture dependency in `reference-opening-locked.ts`; no strength, threshold,
sample count or render-resolution reduction.

Evidence: `D:/Portfolio Evidence/bloom-cascade-20261014/`. Tests use the exact
reference blur shader and the local shader with old/new dependencies, three
patterns (point, lines, colored wake), two dimensions and three levels: 18
outputs. Half-float diagnostics give 15 exact outputs and three tiny arithmetic
differences. The production-format 8-bit run in `byte-targets/comparison.json`
gives 18/18 exact outputs. Before differs on all 12 second/third-level outputs.
Both sides deliberately use identical ceil-sized targets to isolate dependency.

## Bloom buffer dimensions

The reference floors scaled target dimensions; local code rounded up. Corrected
that separately after the cascade change. Evidence in
`D:/Portfolio Evidence/bloom-sizing-20261014/` compares the same six input states
and all three levels after resampling to the input dimensions. All 18 candidate
outputs match exactly. The divisible-size control already matched; odd dimensions
previously differed by 71,868 / 850,414 / 221,990 RGB channel samples summed across
the three levels of each pattern. The after source/build is recorded separately.

## Scoped performance measurement

The live reports `1791972484879-gpu.json` and `1791972568009-gpu.json` in the
performance-audit evidence folder are rejected for speed comparison: roughly
one-second scheduling gaps, only 25 / 4 intervals, and different viewport heights.
Visibility was reported visible, so the cause is not established. Do not quote
these as normal FPS or as evidence of an application regression.

An isolated six-pass GPU test avoids RAF pacing and readback inside the measured
region. 32 samples per variant per size alternate order after warmup; no GPU
disjoint flag. Evidence: `bloom-cascade-20261014/gpu-isolated/comparison.json`.
Median milliseconds before/after: 1920x1080 0.067584/0.046080;
2531x1217 0.074752/0.053248; 2560x1440 0.140288/0.073728.
At 2560x1440 p95 worsens from 0.505856 to 0.961536, so the small median savings
must not be generalized into a stable whole-page improvement. This test measures
the cascade factor with identical ceil-sized targets, before the sizing factor.

## Build and live checks

All three sequential production builds pass. Protected identity GLB SHA-256 remains
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
Normal Edge preview on 4421 loads the opening and accepts pointer drag with no
observed console errors. White About drag produces a visible local grid wake,
and scrolling into Vision retains the colored edge and hides the controller.
The opening and white screenshots are live sanity checks, not a
matched native-frame comparison. No whole-site completion claim is made.

Remaining: native fast sweeps/reversals/settling in opening and both white
regimes; full pointer integration; whole-page performance and all
earlier visual/interaction requirements in the master and whole-site ledger.

## Desktop fluid precision follow-up

Changed the three simulation targets to FloatType where both renderable floats
and linear float filtering are supported; retain HalfFloatType otherwise. The
desktop reference uses float targets. The old half-float format accumulated
rounding through the nine passes. Resolution, iterations and effect strength stay
unchanged. Evidence: `D:/Portfolio Evidence/fluid-precision-20261014/`.

630 controlled frames (60/120/240 Hz) with cadence fixed on both sides give mean
RG error before/after: 0.0001283534/0.0000006893;
0.0000866006/0.0000007984; 0.0000654351/0.0000013115.
The production-constructor repeat in `production/comparison.json` covers another
630 frames, verifies FloatType was selected, and gives 0.0000006893,
0.0000007984 and 0.0000013244. Residual shader arithmetic differences remain.
This is numerical simulation evidence, not visual or native motion acceptance.

Isolated GPU cost: 80 samples per format/size, alternating order, after warmup.
256x144 field median: half 0.019456 ms, float 0.029696 ms; 256x256:
0.023552/0.039936 ms. Tail timings are noisy (first-size p95 0.392192/0.733184).
The precision change costs a small amount of GPU time; it is a fidelity fix,
not a performance improvement. Three square targets add at most 1.5 MiB.
Production build passes. Rebuilt Edge opening and white chapters accept pointer
input; no captured console errors. Live screenshots are saved separately.

## White-section invisible work

When `uReveal < .001`, the colored-side fragment shader discards every fragment.
The depth mask serves that side only; the grid/rim ignore depth. Skip the mask,
colored mesh and 64x64 animated noise pass only below this same threshold. Resume
all three before a colored fragment can be visible, using current absolute time.
Shader precompilation still includes the colored side.

Evidence: `D:/Portfolio Evidence/white-hidden-work-20261014/`, including before
source, instrumented source, comparison, GPU report, build and live About/Vision.
40 full RGBA comparisons at 2550x1212 are exactly identical: ten travel states,
both directions, with/without a fixed active wake, including either side of the
reveal threshold. Draw calls fall 7 to 4 at rest and 8 to 5 with an active wake
below the threshold; visible-side cases remain unchanged. This covers the local
optimization, not reference scene parity or native transition timing.

40 GPU samples per variant/state with active wake (fluid computation excluded):
hidden-side median 0.784384 to 0.489472 ms; p95 1.479680 to 1.573888 ms. Visible
control median 0.442368/0.420864 ms, p95 1.248256/1.224704 ms. Median saving is
about 0.295 ms in this isolated hidden-side scene; noisy tails prevent a stable
whole-page speed claim. Build passes and live Vision retains the colored edge.
