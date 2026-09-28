# Footer match validation - October 11

**Verdict: FAIL. No 100% match claim is supported.**

The user required inspectable proof. No production code was changed in this
validation pass. Build identity remains
`77d48a4603d5eeeeb5bc9339d14f008dba3270ed9ace84faaa0f8684b38af861`.

## Inspectable evidence

Root: `D:/Portfolio Evidence/current-20261011/footer-full-validation`.
Open `index.html` for the interactive frame slider, paired full-resolution image
links, measurements and limitations. Slider and previous/next controls were
operated successfully in isolated Edge. Raw evidence: `sequence-verdict.json`,
`reference-119-frames.json`, `local-119-frames.json`, `png-integrity.json`.
Capture script: `../.codex-local/maintenance-20261009/validate-footer-sequence.mjs`.

Captured 119 reference and 119 local PNGs at 1691 x 872, DPR 1. All 238 PNGs
were decoded, dimension-checked and hashed (file and decoded RGB). All 118 adjacent
state pairs are present on each side; presence is not a visual transition review.
Individually inspected four pairs / eight images: asset frames 22, 45, 65, 92.
These are sufficient to reject the candidate; remaining images are not claimed
as individually visually reviewed. Reference loading overlay is fully hidden,
outro is at viewport top, and the sound prompt was dismissed.

## Confirmed failures

- A center trajectory differs by up to 5.65157 CSS pixels. Retaining the CSS
  animation objects fixes the earlier diagnostic's lost transition handles.
- Frame 45 horizontal opacity: reference 1.0, local 0.65.
- Frame 92: reference construction guides disappear; local horizontal/diagonal
  guides remain. Local first horizontal opacity is 0.0961704.
- Outline progression visibly differs at frames 22 and 45. Letter shapes are
  intentionally different; this does not accept invented progression timing.
- The backdrop remains an unvalidated approximation. Its reference shader clock
  is not aligned in this capture, so no temporal background error is claimed.

Fill opacity maximum difference is 0.00140186 across the asset states, accounting
for hidden reference layers. The previous vertical-only attribute test still
passes its tolerance (0.48652 CSS px endpoint difference). Neither result cancels
the failures or establishes complete pixel equality.

## Evidence boundaries and next work

This is supplemental live-reference controlled replay of the authored animation,
not the authoritative August native recording and not native FPS. The first 100ms,
scroll entry/exit, footer links, reduced-motion parity, mobile parity, GPU/VRAM and
frame pacing are not validated by this sequence. Existing historical native corpus
was located and preserved; no corpus was regenerated or deleted. No whole-image
percentage is assigned because ANIK content intentionally differs.

Next fix measured horizontal/diagonal tracks with a narrow before/after capture;
then A easing, outline progression and backdrop. Repeat comparison against each
candidate and complete native chronological validation before acceptance. Do not
replace this failed baseline or describe its capture count as a parity pass.
