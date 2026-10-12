# White chapter grid correction ? October 13

## Scope and decision

Replace the white chapter's approximate analytic grid with the reference flat,
dark grid and instanced crosses. Preserve the palette, vignette, sculpture camera,
protected GLB, pointer solver, footer and page content in this factor.

The old grid used fixed pixel widths and subtracted gray. The reference uses
fractional-cell line widths, separately alpha-blended black crosses, centered
square coordinates and 81 instances. Cross size is scaled to the reference's
8-unit minimum camera span without changing the sculpture camera.

## Evidence

Root: `D:/Portfolio Evidence/white-grid-20261013`.
Rollback: `before-light-chapters.ts`; remove only the new helper to reverse this
factor. Source helper: `src/scripts/white-chapter-grid.ts`.
Reference shaders were extracted directly from the previously saved live bundle,
not imported from the candidate helper. The fixture uses a uniform gray baseline
to isolate the pattern from palette/compositor differences.

- `grid-comparison.json`: 16/16 isolated states have zero changed pixels and
  zero channel error against the reference shaders/camera. Four scroll values at
  2040?969, 1920?1080, 1000?600 and 800?1000, DPR 1. Reference nonblank and pattern
  guards passed. The old pattern differed in 200,832?519,328 pixels per state.
- Final helper SHA-256: `31b8f1a1e76bd60b7f2c3585105aeaf0031402cea953da8b1c79187a6e0346cd`.
- `rest-transfer-report.json`: 4/4 full local scene poses pass the direct versus
  compositor transfer check with zero changed pixels, 2550?1212 physical pixels,
  DPR 1.25, 4 samples, nonblank/opaque guards. This proves no rest-copy softening;
  it is not a reference sculpture comparison.
- `build.log`: npm run build passed; 62 Astro files, zero errors/warnings/hints,
  ESLint, 23 pages, 21 indexed. Existing large-chunk advisory remains. An initial
  geometry-copy type error was corrected before this successful build.
- `after-live-vision.png`: rebuilt production preview in Edge, at late Vision.
  No browser error logs captured. Screenshot position is not aligned with the
  earlier entry screenshot; it is runtime proof, not an image-difference result.
- Protected GLB SHA-256 remains
  `04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.

## Open gates

Palette/vignette, outline depth, white response regimes, matched pointer paths,
whole-page performance, native chronological comparison and whole-site acceptance
remain open. Do not extrapolate the isolated 16-state result to the full website.
