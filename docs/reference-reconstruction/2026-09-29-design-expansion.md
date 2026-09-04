# User-directed visual corrections and page implementation

The user expanded the active work: preserve the A geometry but correct its surface; preserve
project artwork colors while keeping curved glass presentation; redesign the home sections from
Work Holds onward and the top-level routes using Alche's visual language; add Bengali secondary
copy; preserve the existing Send me a message area. Smoothness is still a required gate.

## Implemented, with bounded decisions

1. **Project artwork rendering:** removed the gallery shader's RGB separation, lens distortion,
   vignette, and full-face reflection. Retained curved mesh geometry and restricted reflection to
   its thin rim. Render the foreground rail after scene postprocessing, using the sRGB output
   conversion. The artwork no longer receives fluid displacement, bloom, or the 1.30 scene gain.
   The fragment path now makes two texture samples instead of thirteen. This is a shader-work
   reduction, not a measured frame-rate improvement. Before/after replay: 24 pictures each;
   candidate integrity: 24 decoded, 23 transitions, zero errors. Primary viewed picture 24 from
   both captures; remaining individual visual review and moving-rail comparison are pending.
   Retain for the explicit original-color requirement; glass-rim tuning remains open.
2. **Works and interior pages:** added a scoped dark grid/ambient background, preserved ANIK SVG
   header, compact navigation, reference-like page proportions, image-led Works archive, and
   category buttons with real project counts. About, Writing, and Services retain authored content
   with shorter titles and Bengali accents. Primary inspected all four desktop routes in Edge.
   All four category buttons show one project; All restores four. At a 390px viewport the archive
   has no horizontal overflow. This is a responsive smoke check, not mobile parity acceptance.
3. **Lower homepage:** replaced the mounted WorkHolds component with MissionChapter, retaining the
   original source file for rollback. Added a pale grid, black-backed statements, Bengali copy,
   a scroll-reactive outline using the existing ANIK vector, outlined VISION heading, and large
   service images with bilingual descriptions. Primary inspected mission, vision, services, and
   contact in Edge. This implements the reference's section structure; it does not yet reproduce
   the reference's complete 3D mission/vision choreography or service-wall projection.
4. **A material candidate:** blend reflection with transmitted light instead of adding a second
   transmission copy. Two 24-picture simulated captures; all 24 candidate pictures decoded and
   23 transitions audited. Clipped-white fraction in the documented triangular screen ROI falls
   from 40.18% to 13.93%. That region is not a perfect mesh mask or an aligned reference comparison.
   Primary individually viewed picture 24 before/after. Retain provisionally: broader surface
   frequency, refraction, brightness, input alignment, and chronological visual review remain open.
5. **Unused depth work:** removed the unsampled depth textures and per-frame depth copy; retain
   the scene depth buffer, remove depth from the color-copy target. All 24 before/after decoded
   RGB frames are identical. Retain this isolated efficiency improvement. No FPS gain is claimed.

## Reference inspection

Live https://alche.studio/ was inspected at home, Works, About, News, and stellla. Valid loaded
home screenshots include scroll positions 10,000, 12,000 and 16,000 at 1440x900: pale mission/vision
scenes and the dark projected service scene. Initial `reference-service.png` and
`reference-home-15000` through `27000` showed the loader and are **not design evidence**; use the
`loaded-*` captures. Luna reviewed three screenshots and supplied a read-only report; its later
turn hit a usage limit. Its PowerShell mojibake observation was not proof of corrupt source;
browser checks confirmed the preserved English and new Bengali after an initial new-file encoding
error was corrected. No reference source, brand, or project media was copied into production.

## Preservation and checks

- `npm run build` passes: zero source errors/warnings and 23 built pages, 21 indexed.
- `git diff --check` passes (Windows line-ending notices only).
- Protected GLB SHA-256 unchanged:
  `04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
- Home contact markup is byte-identical to the pre-change snapshot, SHA-256
  `31f87199d09a643f187237f17363a7a6c3f9155151f945b5276c3aaceb45ae06`.
  Its CSS, assets and links were not edited. Interior styles are scoped away from contact.
- Live preview remains at http://127.0.0.1:4321/. No push or deployment.
- Headless idle diagnostic: 359 RAF intervals, mean 4.167ms, p95 4.3ms. These are callback
  intervals, **not native displayed FPS**, GPU timings, a scrolling test, or a before/after
  performance comparison. The user's reported choppiness remains unresolved by this measurement.

## Evidence and narrow rollback

SSD root: `C:\Users\anikh\.codex\scratch\portfolio-recovery-20260929\user-review`.
Sequences: `gallery-before`, `gallery-after`, `surface-before`, `surface-after`, `depth-after`.
Screenshots: `archive-final.png`, `archive-built.png`, `mission-built.png`,
`services-home-built.png`; `archive-filter-results.json` records all five filter checks.

Reports under `.reference-local/recovery-20260929`: `gallery-color-integrity.json`,
`surface-energy-integrity.json`, `surface-energy-diagnostic.json`, `depth-copy-regression.json`,
`runtime-design-diagnostic.json`, `design-preservation.json`, `build-design-final.log`.

Snapshots under `source-before`: `gallery-color-before.ts`, `surface-energy-before.ts`,
`depth-copy-before.ts`, and `interior/` with original page/layout files. Roll back only the relevant
hunk or scoped component import. Do not overwrite the whole current source with a snapshot.

Full native all-frame parity, full motion review of these candidates, performance acceptance,
and complete desktop/mobile acceptance remain **not proven**. Do not label these pages or the
material a 100% match. Continue with aligned moving-project/surface evidence and native profiling.
