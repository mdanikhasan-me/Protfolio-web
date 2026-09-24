# Dark project reflections, October 9

The reported Boilabin-to-Salty Steak transition was reproduced with wheel input in
both directions. All four project textures were ready. The wall's page fraction
and current/next image selection advanced correctly. This was an exposure problem,
not a missing second texture or a reduced-motion branch.

At 512 square pixels, the source image's mean maximum RGB channel was 0.679 for
Boilabin, 0.227 for Salty Steak, 0.237 for SoctuKit, and 0.564 for UIU Bot. The fixed
LED mask and chamber falloff made the dark UI image almost disappear.

## Isolated change

Only derived wall textures receive exposure compensation. Images already above
0.5 mean value pass through unchanged. For darker images, a bounded histogram
search chooses exposure toward 0.5. A shared RGB gain preserves hue and keeps black
at black and white at white. Exposure is computed once during texture creation,
not while scrolling. The cards, source images, wall geometry, transition timing,
shader saturation, and text are untouched by this change.

The initial linear-average exposure candidate was rejected as visually too subtle.
The histogram candidate is retained as a targeted visibility improvement. It is
content adaptation for this portfolio, not proof of pixel parity with different
reference artwork.

## Evidence

All folders below are under `D:/Portfolio Evidence/current-20261009/`:

- `project-wall-before`: seven settled scroll states, forward and backward.
- `project-wall-exposure-after`: seven states from the rejected weaker candidate.
- `project-wall-after`: seventeen reduced-motion states, including quarter/half
  transitions and reverse travel. Screenshot sampling is not native frame capture.
- `project-wall-normal-after`: seven normal-motion states, forward and backward.
- All 24 final sampled PNGs decoded successfully and have file/decoded-RGB hashes
  in `project-wall-after/final-integrity.json`. Six final PNGs were individually
  visually reviewed: all four centered projects, the first transition midpoint,
  and Salty Steak on reverse travel. The other 18 are not claimed as visual review.
- Each run records the served HTML hash, image sources, scroll position, title,
  texture-ready flag, wall phase, and browser errors. All four runs had no page errors.
- Scripts used for the final and baseline runs are copied alongside their reports.
- `project-wall-after/visible-wall-stats.json`: the visible wall crop
  `[600,100,1450,190]` above the card. Salty Steak's mean blue increases from 6.54
  to 16.88 out of 255. Boilabin and UIU Bot differ by less than 0.001 mean absolute
  channel values in that crop. This is a regional visibility measure, not a parity score.
- Connected Edge: reloaded production preview and selected Salty Steak using the
  visible Next project control; the second project's blue wall field was observed.
  Screenshot: `project-wall-after/edge-salty-steak.jpg`.

Rollback of this factor: sibling workspace
`.codex-local/maintenance-20261009/background-before-project-reflection.ts`.
The opening surface-frequency experiment was returned to 3.25 before this baseline.
Earlier provisional rest-pose/depth work was present in both before and after.

`npm run build` passes (53 checked source files, no diagnostic errors/warnings/hints;
23 built pages). Existing bundle-size and ineffective dynamic-import warnings remain.
The protected identity GLB SHA-256 remains
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
Full native-frame comparison, runtime FPS acceptance, and overall reference parity
remain open.
