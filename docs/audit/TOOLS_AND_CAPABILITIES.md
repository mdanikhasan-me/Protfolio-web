# Tools and capabilities audit

- Checkpoint: 1
- Audit date: 27 July 2026 (Asia/Dhaka)

## Capability inventory

| Capability                                | Status                 | Verified evidence                                                                      | Later action                                                                                                        |
| ----------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Image generation                          | Available              | The local tooling `imagegen` skill and image-generation tool are present                       | Use only for Checkpoint 2 concept/texture drafts; no faces, fake UI, or embedded text                               |
| Web-game-development skill                | Unavailable            | No dedicated web-game-development skill is installed                                   | Use ordinary audited web/Three.js engineering after game-concept approval                                           |
| Browser control                           | Available              | In-app browser-control skill is installed                                              | Use when a later checkpoint explicitly requires browser QA                                                          |
| Playwright library                        | Available with caveat  | `@playwright/test` 1.62.0 is installed                                                 | Managed browser binary is absent; installed Chrome and Edge work as explicit executables/channels                   |
| Installed Chrome                          | Available              | `C:\Program Files\Google\Chrome\Application\chrome.exe`                                | Suitable for local browser and WebGL tests                                                                          |
| Installed Edge                            | Available              | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`                         | Existing capture script targets the Edge channel                                                                    |
| Blender                                   | Available              | `C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe`                    | Use non-interactively through versioned Python scripts                                                              |
| Blender version                           | Available              | Blender 5.2.0 LTS, build hash `fbe6228777e7`, built 14 July 2026                       | Pin audit outputs to this version                                                                                   |
| ffmpeg / ffprobe                          | Missing                | Not found on `PATH` or standard audited locations                                      | Install before the motion-proof demonstration-video checkpoint                                                      |
| Python                                    | Available              | CPython 3.14.3 at `C:\Python314\python.exe`                                            | Suitable for deterministic reference and Blender helper scripts                                                     |
| Python imaging                            | Available              | Pillow and NumPy import successfully                                                   | Used for full-frame decode, pHash, structural difference, motion approximation, colour analysis, and contact sheets |
| OpenCV / scikit-image / ImageHash / SciPy | Missing                | Imports unavailable                                                                    | Not essential for Checkpoint 1 because equivalent documented calculations are implemented locally                   |
| Node.js                                   | Available              | Node 24.14.1                                                                           | Satisfies repository engine floor                                                                                   |
| npm                                       | Available              | npm 11.12.1                                                                            | Existing package manager                                                                                            |
| Astro                                     | Available              | Astro 7.1.3                                                                            | Existing static architecture                                                                                        |
| Git                                       | Available              | Git 2.53.0 for Windows                                                                 | Bundle backup, branch, commit, and push workflow verified                                                           |
| GPU                                       | Available              | NVIDIA GeForce RTX 3070, current Windows driver `32.0.16.1074`                         | Test low-power fallbacks separately; discrete-GPU success is not low-power evidence                                 |
| WebGL 2 local test                        | Available              | System Chrome created WebGL 2 via ANGLE/D3D11 on the RTX 3070; max texture size 16,384 | Repeat with production route, integrated/low-power mode, context loss, and no-WebGL fallback later                  |
| Raster compression                        | Available              | Sharp 0.35.3 / libvips 8.18.3 outputs JPEG, PNG, WebP, and HEIF/AVIF                   | Sufficient for planned responsive raster pipeline                                                                   |
| ImageMagick / `cwebp` / `avifenc` CLIs    | Missing                | Not found                                                                              | Sharp covers current needs; install a CLI only if a later reproducible pipeline requires it                         |
| glTF optimisation                         | Missing                | No `gltfpack` or `gltf-transform` CLI found                                            | Install before production 3D asset optimisation                                                                     |
| Pagefind                                  | Available              | Pagefind 1.5.2 built and indexed 21 pages                                              | Retest against approved Stories/route structure                                                                     |
| Axe                                       | Installed but unused   | `@axe-core/playwright` is in dev dependencies                                          | Wire into later accessibility tests                                                                                 |
| Vitest                                    | Installed but no tests | Test command exits 0 with “No test files found”                                        | Add real tests before treating it as a gate                                                                         |
| Lighthouse CI                             | Missing                | No config or script                                                                    | Add reproducible performance checks at the technical-foundation checkpoint                                          |

## Blender resolution

The initial standard-path scan missed the Steam installation and was not sufficient. Anik supplied
the Start Menu shortcut:

`C:\Users\anikh\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Steam\Blender.url`

It resolves to Steam application `365670`. Steam's `libraryfolders.vdf` records that application in
`C:\Program Files (x86)\Steam`, leading to the verified executable:

`C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe`

Direct non-interactive verification:

```text
Blender 5.2.0 LTS
build hash: fbe6228777e7
build date: 2026-07-14
```

Future Blender work must:

- run through command-line Python scripts;
- save the scripts under `tools/`;
- use deterministic inputs where practical;
- record Blender version, render/export settings, and source hashes;
- avoid undocumented manual scene edits;
- validate GLB output and optimise it with an approved glTF tool.

## Reference-analysis implementation

`tools/reference_analysis/analyze_frames.py` uses only Pillow, NumPy, and Python's standard library.
For every decodable source frame it records:

- parsed frame number, path, and dimensions;
- 64-bit low-frequency DCT perceptual hash;
- consecutive pHash distance;
- normalised mean pixel difference;
- global structural-similarity score;
- phase-correlation global shift plus aligned residual as a documented motion approximation;
- mean and dominant quantised colours;
- HSV summary and dark/light ratios;
- robust scene-change probability.

The searchable SQLite index and large contact-sheet set stay outside Git beside the references.
Machine processing and direct visual inspection are reported separately; the script does not claim
human visual review.

## Current limitations

1. No ffmpeg means later local demonstration videos cannot yet be encoded through the requested
   reproducible pipeline.
2. No glTF optimiser means Blender can create/export GLB studies, but production-size evidence
   cannot yet be completed.
3. Playwright's managed Chromium binary is missing. System Chrome and Edge are usable, so this is
   not a present blocker.
4. The available machine proves discrete-GPU WebGL only. It does not prove integrated graphics,
   mobile GPU, thermal throttling, or save-data behavior.
5. No dedicated game-development skill is available. This does not block ordinary web game
   engineering, but the later game proof will require explicit architecture and performance work.
