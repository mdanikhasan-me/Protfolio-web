# Return-home color cut: local correction

The schedule selected the violet pattern at reference picture 17,682, then switched to the
chromatic pattern at 17,698. Individual inspection of all 16 native pictures 17,682-17,697 shows
the chromatic chapter already present. Change only the 17,682 pattern entry from `2` to `0` in
`src/scripts/reference-background-system.ts`; preserve the existing panel-layout events.

## Evidence and decision

Retain this local schedule correction. The current build was rendered at every simulated
1/120-second step for pictures 17,680-17,703, after replaying every preceding step. All 24 PNGs
pass decoding, hash, dimension, and chronological checks; all 23 adjacent transitions were
measured. The primary agent individually viewed all 24 reference pictures and all 24 candidate
pictures, including the next panel-layout change at 17,698. No new disappearance or transient
violet chapter was observed. ANIK composition remains intact.

The available before/after overlap covers 11 pictures, 17,680-17,690. The first two are RGB-identical.
All nine affected pictures improve in each measured wall region:

| Wall region | Before mean pixel MAE | After mean pixel MAE | Reduction |
| --- | --- | --- | --- |
| Left | 7.609 | 6.565 | 13.7% |
| Right | 16.873 | 12.782 | 24.2% |
| Lower | 15.030 | 14.336 | 4.6% |

These percentages apply to that nine-picture overlap only. The complete 24-picture candidate
comparison is separate. Spatial color placement, reference input/pose alignment, and clipped
object highlights remain unresolved. This is simulated replay, not native 120-fps capture or
runtime performance proof, and does not establish full-site parity.

`npm run build` passed with zero source diagnostics. The protected GLB SHA-256 remains
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.

## Evidence paths and rollback

SSD capture root: `C:\Users\anikh\.codex\scratch\portfolio-recovery-20260929`.
Before: `blackout-exit-17661-17690`; after: `pattern-17680-17703`.

Reports under `.reference-local/recovery-20260929/`:

- `pattern-17682-before-after.json`: exact overlap and per-picture regional errors.
- `pattern-17682-comparison.json`: all 24 candidate/reference pictures and 23 transitions.
- `pattern-17682-integrity.json`: 24 decoded, zero errors.
- `pattern-17682-visual-ledger.json`: individual review linked to PNG and decoded-pixel hashes.
- `build-pattern-17682.log`: production build output.

Narrow rollback: change only the 17,682 pattern entry back to `2`. The source snapshot
`source-before/pattern-17682-before.ts` retains the earlier blackout-release candidate; do not
replace the entire current file with that snapshot. The blackout candidate's separate 120-picture
visual review remains incomplete.
