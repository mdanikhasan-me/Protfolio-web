# Hinode City vertical-slice validation

Date: 2026-07-28

Branch: `rebuild/hinode-from-zero`

Route: `/play/hinode-preview/`

Default quality: medium

## Verified

| Check                         | Result                                                  |
| ----------------------------- | ------------------------------------------------------- |
| Astro type diagnostics        | Passed: 57 files, 0 errors, 0 warnings, 0 hints         |
| ESLint                        | Passed                                                  |
| Unit tests                    | Passed: 3 files, 11 tests                               |
| Static clean-room validation  | Passed: 11 checks                                       |
| Isolated Chrome E2E           | Passed: 2 tests                                         |
| Unrelated portfolio-route E2E | Skipped conditionally; see limitation below             |
| Production build              | Blocked by a pre-existing missing declared font package |
| In-app browser inspection     | Unavailable: the in-app browser inventory was empty     |

The automated Chrome checks used a `1440 × 900` viewport and the system Chrome channel. They proved
that the route reaches ready state, creates a live WebGL render, starts driving, accelerates,
steers, reduces grip under handbrake, resets, pauses, and stays below the runtime draw-call and
triangle budgets. The route exposed these representative default-mode values during the run:

- approximately `180 FPS` in headless automation;
- `22` draw calls;
- `19,764` visible triangles;
- `2` textures;
- `22` geometries.

The FPS number is an automated headless measurement, not a manual RTX 3070 gameplay benchmark.

## Static asset measurements

| Metric                     |        Measured |                  Budget |
| -------------------------- | --------------: | ----------------------: |
| Public Hinode raw payload  | 1,452,165 bytes |           informational |
| Public Hinode gzip payload |   400,042 bytes |            below 12 MiB |
| Environment triangles      |          17,944 |   below 180,000 visible |
| Vehicle triangles          |           1,820 |   below 180,000 visible |
| Combined visible triangles |          19,764 |   below 180,000 visible |
| Building modules           |               8 |                     6–8 |
| Baked atlas                |     1024 × 1024 | 512–1024 routine target |

`npm run validate:hinode` parses both GLB headers and JSON chunks, checks their triangle counts and
required vehicle nodes, totals raw and gzip payload, verifies all six Blender sources, enforces the
75 m × 60 m boundary and road contracts, checks rejected local paths, and scans the new
implementation for rejected-game identifiers.

## Blender render evidence

The six required renders are generated and visually inspected under the ignored evidence directory:

1. `artifacts/hinode/blender/hinode-top-down.png`
2. `artifacts/hinode/blender/hinode-road-spline-clearance.png`
3. `artifacts/hinode/blender/hinode-alley-entrance.png`
4. `artifacts/hinode/blender/hinode-alley-curve.png`
5. `artifacts/hinode/blender/hinode-flyover-composition.png`
6. `artifacts/hinode/blender/hinode-secondary-merge.png`

The source and render evidence confirms a continuous alley curve, T-junction, secondary road, canal
edge, visible elevated flyover, eight modular buildings, props outside the intended corridor, and
the original coupe.

## Explicit limitations

The repository declares `@fontsource/fraunces`, but `node_modules/@fontsource/fraunces/600.css` is
absent. Both the portfolio production build and unrelated portfolio routes therefore fail while
PostCSS resolves `src/styles/global.css`. Installing or reconstructing that dependency was expressly
prohibited, so no package operation was performed. The isolated Hinode route still loaded and ran
beneath Vite's unrelated error overlay; its automated test dispatches the start action directly only
when the declared font file is absent.

The in-app Browser backend returned no available browser surfaces. Consequently, no manual
click-through, in-app screenshot, or manual browser gameplay recording is claimed. Playwright
failure recordings are diagnostic artifacts only and are not accepted as final gameplay evidence.
