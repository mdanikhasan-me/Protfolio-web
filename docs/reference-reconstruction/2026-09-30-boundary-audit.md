# Section boundaries and responsive audit

The user requested a systematic audit rather than continuing to identify every defect manually.
This ledger records observed defects, not an invented count of 100 issues. Full native all-frame
reference acceptance remains open. Preserve prior scope in the master state and scroll-repair ledger.

## Findings and decisions

| Issue | Evidence / cause | Current action and gate |
|---|---|---|
| Vision paints over Writing | Sticky canvas escaped its chapter stacking/paint boundary; Writing label appeared with no Writing content | Isolated and clipped light chapter, explicitly layered Writing. Rendered Writing is restored. |
| Interior footer black slab | Live reference Contact keeps grid through footer | Removed opaque footer background on studio pages. Before/after screenshot reviewed. |
| Footer hierarchy reversed | Reference links and copyright precede wordmark | Reordered existing content; preserved ANIK construction animation and destinations. Rendered after reviewed. |
| Excess footer height | 95svh minimum plus logo-first composition produced empty interval | Content-sized footer; small-screen bottom gaps removed. Responsive after check pending. |
| Contact title crosses header | Outgoing title runs behind fixed logo | Clip only departing contact-stage content at header boundary, preserving title/illustration composition. Rendered sweep pending. |
| Section label ahead of visible content | Most severe case caused by hidden Writing | Containment fixed. Final transition sweep still required. |
| Header changes contrast early at light exit | Different modules write surface state | Exact boundary ownership still open; no claim fixed. |
| Outline joints imperfect | Expanded hull leaves breaks at some perspective joins | Open, separate from repaired fully missing outline. |
| Vision colored side unlike reference | Procedural side mapping remains approximate | Open; no full material match claimed. |
| Mobile A clipped | Orthographic frustum used desktop vertical extent on narrow portrait viewport | Fit both axes to portrait width; material/effects preserved. After capture pending. |
| Mobile Bengali overlarge | Viewport-height font sizing makes many lines on 390px width | Narrow-screen width-based heading size. After capture pending. |
| Vision first entry hitch | Cold fast-entry diagnostic has 108ms task and 108.4ms max callback gap | Compile shaders asynchronously while 3 viewports away. Prepared-entry diagnostic: no long tasks, max 8.2ms. Different entry preparation; not a controlled native benchmark. |
| A motion rule | Latest user clarification: pointer at top, subtle scroll movement elsewhere | Deterministic scroll pose, no idle spin. At actual y1600/2895/4412 poses differ; pointer does not alter them. Return to y2895 repeats pose. |
| Background name/pattern sequences | User continues to report incorrect spatial pattern/movement | Open. Retain recorded corpus and compare matched states, not arbitrary timestamps. |
| Card liquid-glass edges | Curvature repaired, polished refraction still differs | Open. |
| Full viewport feature parity | Previous CSS hides some controls/details on mobile | Open; no blanket responsive acceptance from overflow checks. |

## Evidence

SSD root: `C:/Users/anikh/.codex/scratch/portfolio-recovery-20260929/scroll-repair/`.

- `boundaries-before`: three baseline boundary screenshots, `positions.json`,
  `writing-containment-after.png`, `contact-footer-after.png`, `scroll-pose-after.json`.
- `reference-bottom-study`: live Contact footer approach at four positions plus continuous video.
  Primary individually reviewed -350 and 0 screenshots. It shows continuous grid and links above
  wordmark. Do not generalize this to unrelated home transitions without inspection.
- `viewport-audit`: 390x844, 768x1024, 1366x768; top, Mission, Vision, Contact screenshots at each.
  All three no page errors / no document overflow. Primary reviewed 390 Mission/Vision/Contact
  and 768 Vision, identifying clipping invisible to overflow metrics.
- `.reference-local/recovery-20260929/vision-first-entry-before.json` and
  `vision-entry-prewarmed.json`: headless RAF/long-task diagnostics; NOT native FPS or GPU metrics.

One user-authorized Luna read-only reviewer inspected five screenshots (prior full-review stages
10/11 and user screenshots 201208/201220/201127), identifying ten observations with screenshot-only
inferences marked. Primary reproduced the paint-order cause and inspected live reference footer.
No overlapping source edits were delegated.

## Latest outcomes

- `boundary-final-check/report.json` records seven boundary/return stops at each of 390x844,
  768x1024, 1366x768, and 1920x1080, plus five interior routes per width. Zero runtime/console
  errors (known meta frame-ancestors warning excluded), zero document overflow, 20 route responses
  HTTP 200, unchanged build hash throughout. It includes continuous video per width and 28 sampled
  screenshots; primary reviewed 1920 Writing/footer and 390 Writing/768 Vision individually.
  This is not a native all-frame reference comparison.
- Mobile outline fits both axes and its width now remains approximately constant in screen pixels.
  Material, animated side, scroll zoom, and pointer field are preserved.
- Surface-color ownership is now centralized in `home-state.ts`; the two renderers no longer
  fight over `data-reference-surface`. Header color follows the actual background at y64.
- Latest scroll-motion rule supersedes the previous top-only/no-rotation-outside-opening note:
  pointer rotation at top; small deterministic scroll pose outside it; no autonomous spin.
  Four-stop report confirms stable pose during pointer movement and repeatable reverse scroll.
- Prepared Vision entry diagnostic had no long task and max 8.2ms RAF interval versus a cold fast
  entry with one 108ms task. These are different entry paths, not a controlled native FPS/GPU
  benchmark. Shader preparation is moved offscreen without reducing material or resolution.
- Post-check small fixes: mobile Writing top clearance and normal-width type; construction guides
  clipped to the footer brand region so they do not cross links; Escape closes mobile navigation.
  Final build passed. `boundary-final-controls.json` confirms mobile menu opens and closes with
  Escape, no page errors or overflow; `390-writing-final.png` individually inspected. Protected
  GLB SHA-256 remains unchanged. Source diff whitespace check passed.

Remaining gaps include exact reference background spatial/motion sequence, light-side material
and outline joins, card refraction edges, full mobile control availability, all-frame native
desktop comparison, and measured native GPU/CPU/VRAM performance. Do not report full parity.
