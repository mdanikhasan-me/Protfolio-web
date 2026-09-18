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
