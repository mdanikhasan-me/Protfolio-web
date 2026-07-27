# Reference inventory

- Checkpoint: 1
- Inventory date: 27 July 2026 (Asia/Dhaka)
- Reference root: `C:\Users\anikh\Downloads\MYport`

## Scope and evidence classes

This audit uses two deliberately separate evidence classes:

1. **Machine-indexed evidence**: every source frame was decoded and measured by
   `tools/reference_analysis/analyze_frames.py`.
2. **Direct visual evidence**: selected original 1920 × 1080 JPEGs were opened at source resolution.
   Contact sheets were used only as sequence maps, never as sufficient evidence for fine visual
   conclusions.

Likely implementation and input are labelled as hypotheses. The frames do not expose source code,
DOM structure, event handlers, shaders, asset sizes, device support, or real performance.

## Source inventory

| ID         | Source directory            | Files indexed | Number range  |      Assumed rate |  Approximate duration | Decode result                                                            |
| ---------- | --------------------------- | ------------: | ------------- | ----------------: | --------------------: | ------------------------------------------------------------------------ |
| Website 01 | `Website 1`                 |         6,547 | 000001–007047 |            60 fps | 117.45 s by numbering | All present files decode at 1920 × 1080; frames 006501–007000 are absent |
| Website 02 | `Website 2`                 |         5,300 | 000001–005300 |            60 fps |               88.33 s | All frames present and decode at 1920 × 1080                             |
| Website 03 | `Website 3`                 |         3,958 | 000001–003958 |            60 fps |               65.97 s | All frames present and decode at 1920 × 1080                             |
| Website 04 | `Website_04\frames_full_hd` |         8,619 | 000001–008619 | 58.46 fps average |              147.43 s | All frames present and decode at 1920 × 1080                             |

- Total indexed: **24,424 frames**.
- Corrupt frames: **0**.
- Unparsed source files: **0**.

The prompt describes Website 01 as 7,047 frames. The source directory contains 6,547. The missing
500-frame interval is contiguous, so no conclusion about frames 006501–007000 is presented as direct
observation.

## Machine-analysis outputs

External output root:

`C:\Users\anikh\Downloads\portfolio-reference-analysis-20260727`

| Artifact                 | Evidence                                                           |
| ------------------------ | ------------------------------------------------------------------ |
| SQLite frame index       | `reference-index.sqlite`, 7,823,360 bytes                          |
| SQLite SHA-256           | `7a27e0e6aaf70af8d8265e6164703dfd1315bd3a3e6145b3ef0bd56f6bdfdfd0` |
| Run manifest             | `analysis-manifest.json`, generated 2026-07-27 21:08:18 +0600      |
| Standard error log       | `analysis.stderr.log`, 0 bytes                                     |
| Website 01 derived files | 54 files, 14,111,659 bytes                                         |
| Website 02 derived files | 53 files, 16,503,553 bytes                                         |
| Website 03 derived files | 42 files, 7,181,500 bytes                                          |
| Website 04 derived files | 64 files, 12,281,285 bytes                                         |

Per-frame records include dimensions, a 64-bit low-frequency DCT perceptual hash, consecutive hash
distance, normalised mean difference, global structural similarity, phase-correlation shift, aligned
residual, mean/dominant colours, HSV summary, dark/light ratios, and a robust scene-change
probability. These are triage signals, not semantic understanding.

Generated review aids:

| Site       | Ordered atlases | 0.25 s contacts | 0.5 s contacts | Scene contacts | Motion contacts | Transition strips | Dense text contacts |
| ---------- | --------------: | --------------: | -------------: | -------------: | --------------: | ----------------: | ------------------: |
| Website 01 |              21 |               8 |              4 |              4 |               4 |                12 |                   0 |
| Website 02 |              17 |               6 |              3 |              4 |               4 |                12 |                   6 |
| Website 03 |              13 |               5 |              3 |              4 |               4 |                12 |                   0 |
| Website 04 |              28 |              10 |              5 |              4 |               4 |                12 |                   0 |

## Machine-selected review anchors

| Site       | Highest scene-change anchors                                           | Highest motion anchors                                                 |
| ---------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Website 01 | 4524, 4525, 4523, 2740, 2764, 4522, 4514, 4515, 4521, 4520, 4516, 2243 | 2798, 4523, 2790, 2795, 4525, 4524, 2794, 4522, 2797, 2806, 2804, 4526 |
| Website 02 | 299, 3527, 4130, 4331, 3930, 4459, 4259, 3728, 3857, 458, 3656, 4532   | 299, 3377, 3373, 3375, 607, 4587, 4594, 315, 4564, 4600, 3421, 3419    |
| Website 03 | 2870, 2874, 2869, 2074, 2873, 2875, 2868, 2859, 2871, 2876, 2867, 2872 | 2333, 2329, 2330, 2336, 2332, 2331, 2327, 2328, 2338, 2860, 2322, 2874 |
| Website 04 | 3526, 8262, 6877, 7464, 6892, 7303, 6606, 5039, 6605, 7302, 6890, 5035 | 3526, 8262, 5746, 7614, 7612, 6948, 7619, 7603, 6775, 6771, 6963, 6949 |

Machine peaks frequently represent cuts, route changes, loading frames, fullscreen changes, or
capture-state changes. They were inspected in context rather than treated as automatically important
design moments.

## Direct source-resolution review

The direct review included opening sequence anchors, machine-selected peaks, transition
neighbourhoods, stable reading states, and closing loops. Website 02 frames 001801–002880 received a
dense pass because it is the primary elastic-text reference. Website 04 frames 004503–006051
received a close pass because it is the primary playable reference.

Representative source-resolution anchors:

- Website 01: 1, 180, 360, 640, 770, 900, 1100, 1400, 1600, 1680, 1740, 1900, 2050, 2200, 2243,
  2350, 2500, 2650, 2740, 2760, 2790, 2798, 2840, 2950, 3075, 3200, 3330, 3500, 3650, 3750, 3900,
  4050, 4200, 4400, 4514, 4523, 4600, 4800, 5000, 5200, 5400, 5580, 5780, 5950, 6100, 6250, 6400,
  6480, 7001, and 7047.
- Website 02: 1, 299, 315, 458, 607, 900, 1100, 1400, 1650; a dense set across 1801–2880; then 3000,
  3200, 3377, 3527, 3728, 3930, 4130, 4331, 4459, 4587, 4800, 5100, and 5300.
- Website 03: 1, 300, 600, 900, 1200, 1500, 1800, 2074, 2250, 2329, 2333, 2500, 2700, 2859, 2870,
  2874, 3100, 3400, 3700, and 3958.
- Website 04: 1, 200, 500, 900, 1300, 1700, 2200, 2800, 3300, 3507, 3526, 3691, 4200, 4682, 4692,
  5035, 5039, 5264, 5380, 5525, 5571, 5746, 5814, 6000, 6200, 6500, 6605, 6606, 6619, 6775, 6877,
  6892, 6948, 6990, 7174, 7303, 7377, 7429, 7464, 7521, 7614, 7641, 7900, 8262, 8500, and 8619.

## Limits

- The source is a desktop browser recording. Browser chrome, Windows taskbar, cursor, recording
  notifications, fullscreen banners, loading states, and capture artifacts are not site design.
- Frame rate is assumed from the supplied manifest/guidance; no original video or timecode was
  supplied.
- Still frames can suggest scroll, hover, pointer, keyboard, route, proximity, and camera
  relationships, but cannot prove them.
- No reference source code, network trace, asset manifest, profiler capture, accessibility tree, or
  mobile recording was supplied.
- The audit extracts principles and constraints. It grants no permission to reproduce protected
  branding, composition, assets, text, choreography, or signature objects.
