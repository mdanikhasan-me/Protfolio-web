# Native scroll ownership and measured cleanup — October 1

The latest complaint was that middle-button upward autoscroll placed the native scrollbar at
the top while Works remained on screen. Performance work must preserve all visual effects.

## Retained changes

`src/scripts/home-state.ts` now derives the rail target from cached document geometry every
frame, including when its IntersectionObserver is inactive. A fast native jump can bypass the
observer's active interval; the old gate left the prior card state alive indefinitely. Outside
the observed region, a completed departure synchronizes the rail to its endpoint.

Works snapping is owned by wheel input. Middle-button input, scrollbar input, navigation keys,
and native scroll changes cancel pending snaps and synchronize Lenis with the native position.
Native keyboard handling excludes editable controls. Active wheel animation remains intact.

The same script avoids rewriting unchanged opening visibility, section-rail visibility,
project visibility, and contact clipping. `src/scripts/light-chapters.ts` avoids rewriting
unchanged Vision blur/opacity strings. No precision, easing, shader, render target, resolution,
geometry, or effect was changed for this optimization.

Narrow snapshots live under `.reference-local/recovery-20260929/source-before/`:
`native-scroll-state.ts`, `dom-write-cache.ts`, and `vision-style-cache.ts`.

## Scroll evidence

SSD root: `C:/Users/anikh/.codex/scratch/portfolio-recovery-20260929/scroll-repair/`.

- `native-scroll-before/report.json`: all three cases reproduced incorrect behavior. Native
  autoscroll simulation reached y=0 but retained rail presence 0.6747. Native jump and Ctrl+Home
  were pulled back to y=3654.
- `native-scroll-after/` and `native-scroll-final/`: all three return paths reached y=0,
  rail hidden, presence=0, opening active, and the Top landmark active; zero page errors.
- `native-edge-autoscroll.json` and `native-edge-autoscroll-top.png`: connected Edge at
  2040×974, clicked Works, middle-clicked the bare wall at (380,450), moved to (380,160), then
  pressed Escape at the top. Native y changed from 3225.6001 to 0. Rail hidden, presence=0,
  opening active. This is an actual middle-button gesture, separate from simulated regressions.
- `native-scroll-eight-cases/report.json`: four cases each under normal and reduced motion:
  instant native jump, stepped native-autoscroll simulation, Ctrl+Home, and page refresh.
  **8/8 passed, zero page errors.** Eight resulting screenshots saved. The automation's
  autoscroll loop is explicitly a simulation and does not prove native input or native FPS.

Repeatable regression:

```powershell
node scripts/validation/verify-native-scroll.mjs <new-SSD-output-directory>
```

The harness uses the isolated local Playwright install, creates a new evidence directory, and
records browser version, timestamps, build/source hashes, pre/post states, errors, and screenshots.

## Performance evidence and limits

`zoom-performance-before` versus `zoom-performance-dom-after` uses the same six Vision/outro
wheel stops at 1691×872. DOM attribute mutations dropped from **8,411 to 3,195 (62.0%)**.
All six recorded scroll/blur/opacity/surface states agree exactly. Neither run recorded a
long task during the measured window. Script duration varied from 0.943 to 1.095 seconds;
therefore this comparison proves less redundant DOM work, not a consistent FPS gain.

Final retained-build repeat: `zoom-performance-retained/report.json`, 3,247 mutations
(61.4% below baseline), 0.884 s script time, 2.164 s task time, no long tasks and zero page
errors. All six states again match baseline exactly. Headless callback p95 was 4.3 ms;
this must not be described as the displayed frame rate. The live preview index matches
the production index SHA256
`4FD373816098CBC83649B4ADDEC167AC09657DA05AC3E04D49A0C1AEBF5F133F`.

Lighthouse 13.5.0 was installed only under `.codex-local/performance-tools`. Three sequential
desktop runs used headless Chrome with D3D11 and the same production preview URL:

| Measurement | Before | Retained changes | Repeat |
| --- | ---: | ---: | ---: |
| Performance | 64 | 89 | 93 |
| LCP | 1.5 s | 1.2 s | 1.1 s |
| Total blocking time | 660 ms | 180 ms | 130 ms |
| Speed index | 2.6 s | 1.8 s | 1.6 s |
| CLS | 0 | 0 | 0 |
| Accessibility | 96 | 96 | 96 |
| Best practices | 96 | 96 | 96 |
| SEO | 100 | 100 | 100 |

Reports are `lighthouse-scroll-{before,after,repeat}.report.{json,html}` in the parent SSD
recovery directory. These are diagnostic runs, not a controlled native GPU/frame-pacing study.
Background activity can affect scores. Remaining findings include tiny control hit areas,
accessible-name mismatches, an ignored meta CSP frame-ancestors directive, and image delivery.
No score improvement was obtained by disabling an effect or lowering resolution.

## Rejected experiment

A separate dirty-camera cache skipped unchanged lookAt/matrix/projection updates. The ordered
controller replay decoded 120/120 frames and analyzed 119 adjacent transitions with no integrity
or controller errors, but only **119/120** frames matched the before rendering. Frame 118 had
109,516 differing pixels, maximum channel delta 126, mean channel delta 0.2306/255.
The unchanged candidate repeat matched its first run 120/120, so the difference was not dismissed
as random capture noise. The camera cache was **rejected and narrowly reverted**. Current
`reference-opening-locked.ts` exactly matches `source-before/camera-dirty-cache.ts`:
SHA256 `85380DE9DA8F92C9B923E90DCF267443C11B145F2B5A812B838445101B90F208`.
Candidate performance numbers in `zoom-performance-final` are not retained-build results.

Evidence: `camera-cache-before`, `camera-cache-after`, `camera-cache-repeat`,
`camera-cache-after-audit.json`, `camera-cache-pixel-comparison.json`, and
`camera-cache-repeat-comparison.json`. All 120 frames were machine compared, two versions of
frame 118 were individually visually inspected; this was not all-frame individual visual review.

## Build and outstanding acceptance

`npm run build` passed: 50 checked files, zero errors/warnings/hints, production output and
Pagefind completed. The newly added regression harness separately passes ESLint. Stable preview
at `http://127.0.0.1:4321/` serves the completed production output.

Protected GLB SHA256 remains
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
The frame-rate samples in headless diagnostics are callback timing, not native display FPS.
Full native frame pacing, attributable GPU/VRAM, long-run stability, all-frame reference comparison,
and full desktop/mobile parity remain unaccepted. No push or deployment occurred.

After native gesture proof and the final automated regressions, reconnecting the integrated
browser returned `No browser is available`. That prevents an additional connected-browser
review in this session; it does not invalidate the already saved native gesture evidence.
