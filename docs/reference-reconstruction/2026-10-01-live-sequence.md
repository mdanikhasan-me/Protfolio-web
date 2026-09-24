# Live background sequence and Vision contour

Continuation from the boundary audit; not final reference acceptance.

## Live versus recorded timing

The read-only comparison agent verified saved reference BGQuadTree logic: three logo layouts
(0..2), one-second logo/blackout timer, UV timer 0.2..0.7 seconds for the smooth color pattern
and 0.1..5.1 seconds for binary/violet patterns; pattern transitions 0/0.3/3 seconds, with the
long panel rotation permitted at the opening. Four-second geometry changes occur at the top.

Normal browsing previously used the fixed forensic picture tables and fixed blackout/UV seeds.
It also used a mode 3 that blanks glyphs. Live rendering now uses bounded, reproducible seeded
timers with those reference parameter ranges. Explicit `__capture=1` still selects the recorded
tables and measured seeds. This preserves existing replay evidence while restoring reference-like
runtime behavior. It does not promise identical random events across independent live sessions.

`live-symbol-validation`: nine sampled screenshots plus continuous video; primary viewed 0,3,6.
`live-pattern-validation`: 24 timed state observations cover pattern modes 0/1/2, symbol modes
0/1/2 and four layouts; no mode 3 names, no page errors. Primary viewed samples 0,8,16.
`live-panel-timers-validation`: continuous run, 24 observations and project/return input; primary
viewed samples 4,12,20. Runtime no-error gate passed; complete individual video review remains open.

`runtime-replay-regression`: 24 simulated pictures p1598..1621, all decoded and hashed, 23
adjacent transitions, zero errors. The wall-only region x170..500/y120..280 is RGB-identical in
24/24 comparisons with `surface-energy-after`. This is a scoped regression region, not full image
equality or native 120fps proof. Reports: `runtime-replay-integrity.json` and
`runtime-replay-wall-regression.json` under `.reference-local/recovery-20260929/`.

## Vision contour and material

The expanded-shell outline had bevel gaps. The new front outline is derived from the protected
GLB front-face triangles: shared triangulation edges cancel, leaving the two closed boundaries.
It renders with a 1.5px line material. Initial combined old/new outlines were doubled and rejected;
the old expanded shell was then removed. `single-contour-current` is the retained version, with
one inspected Vision screenshot and full six-position/reverse capture. The GLB bytes are unchanged.

The side material now samples the same simplex noise shader as the background, using a separate
64x64 float texture in its own renderer. It uses the reference's compressed side UV and two-stage
noise sampling rather than the earlier unrelated rainbow value noise. Raw-pixel grain seed was
corrected to normalized screen UV. `vision-noise-current` and `vision-screen-noise-current` each
have six-position captures; primary viewed Vision and close-up from each. The side's exact color
distribution and noise/grain remain provisional, not accepted as pixel parity. Direct-canvas side
gain was subsequently set to the reference compositor's 1.3; final after capture pending.

One capture `outline-boundary-after` accidentally served the preceding build; source/index hashes
were checked and it was superseded by `outline-boundary-current`. Do not cite the former as proof
of the new contour. Always wait for build completion before copying to stable-preview.

## Still open

Exact material mapping/highlights, card edge refraction, live sequence event alignment, native
GPU/CPU/VRAM/frame pacing, complete 32,607-frame current/reference review, and mobile acceptance.
Keep the user's latest rule: top pointer rotation, subtle position-bound scroll pose elsewhere,
no idle spin, protected homepage contact title/illustration and GLB, no push/deploy without request.

## Follow-up checks

- Video counts: single contour 302 frames; symbol validation 321; pattern validation 582; panel
  timers validation 577. All encoded at 25fps, 1690x872. These counts come from ffprobe decoding;
  only the separately stated screenshots have individual visual review. No native 120fps claim.
- `vision-display-current` is the 1.3 gain candidate after capture; primary inspected its Vision
  frame. Six scroll positions, no page errors. Side colors remain a provisional match, not final.
- Corrected stale comments that mislabeled archived frame 1 as homepage opening. Replay retains
  original values; new normal runtime uses separate seeded timers. Seeded randomness supports
  repeatable testing but cannot reproduce independent reference sessions event-for-event.
- Added diagnostic-only `__inspectScene=1` telemetry (picture/pattern/symbol/layout), which does
  not enable simulated replay. Live capture observes this alongside actual pointer/scroll input.
- Card material follow-up retains curved geometry and bounded UV sampling; now includes the
  reference's subtle five-percent front reflection and corner falloff. Before evidence is
  `glass-reflection-before`; after build passed and `glass-reflection-after` is being reviewed.

Card reflection decision: the first linear-space blend was visibly too milky and is rejected.
The retained version converts to display space for the reference's five-percent blend and back
before output conversion. `glass-display-reflection-after` records next/reverse/hover input with
zero page errors; primary individually inspected front and second project. Full glass parity is
still open. `glass-reflection-after` is rejected visual evidence, not the final material.

Vision gain after capture is `vision-display-current`; primary viewed the Vision frame. Side
UV is generated from the protected mesh depth/height because the source side-screen geometry is
different. Thus matching reference shader sampling does not establish equivalent UV mapping.

Final four-width follow-up `oct1-responsive-regression` passed: 390/768/1366/1920 widths, seven
boundary stops each, five routes each, zero recorded runtime/console errors and zero document
overflow; build unchanged throughout. Primary inspected 390 Vision and 1920 Writing-entry images.
The capture contains 28 sampled screenshots and continuous video; no all-frame visual acceptance.
No large evidence placed in production; no push/deploy; protected GLB hash rechecked.
