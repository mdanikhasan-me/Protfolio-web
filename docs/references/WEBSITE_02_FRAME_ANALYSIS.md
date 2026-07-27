# Website 02 frame analysis

- Source: `Website 2`
- Indexed evidence: 5,300 source frames at 1920 × 1080
- Timing basis: 60 fps assumption

## Reading

Website 02 is organized around one reusable rounded media aperture. On the identity page it is a
small capsule; in project mode it expands into a nearly full-screen theatre; on return it contracts
into the original composition. A separate local deformation band makes display text behave like a
viscous material while fixed navigation and unaffected lines remain sharp.

Close inspection of frames 001801–002880 changes the effect hypothesis: this is not a globally wavy
typeface. Glyphs deform only as a line reaches a narrow viewport band. They flatten, bridge, pool,
separate into droplets, and then recover while lines away from the band remain readable. The cursor
is nearly fixed across many anchors, so viewport position/scroll is a stronger driver hypothesis
than pointer proximity, though the frames cannot prove the implementation.

## Sequence map

| Time / frames              | Visible state; moving elements; stable elements                                                                                                                                                                                        | Likely input / implementation                                                                                                                                                                   | Motion purpose / performance implications                                                                                                                                       | Transferable principle / prohibited direct copy                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0–3 s / 000001–000180      | White identity stage: giant “Hey I’m Artem,” a neon scribble, sparse nav, right-side intro, and a small vertical rounded video capsule. Media changes while the page frame stays rigid.                                                | Load/idle video; DOM layout plus clipped video.                                                                                                                                                 | Establishes person, voice, and one media device immediately. A single muted, poster-backed video is manageable.                                                                 | Give one bounded media element several jobs. Do not copy the name treatment, scribble, exact font, layout, or capsule proportions.                                             |
| 3–6 s / 000181–000360      | The capsule rapidly expands until commercial/project footage fills the viewport. Oversized translucent project names and a signature layer appear over scanline/chromatic media; nav stays available.                                  | Click/scroll/hover selection; transform or View Transition from shared media container, with overlay DOM.                                                                                       | Converts an intro object into project theatre without introducing a new visual system. Full-screen filtered video raises decode, paint, and contrast costs.                     | Let one component carry the transition. Do not copy footage, signatures, project list, glitch treatment, or exact expansion.                                                   |
| 6–9 s / 000361–000540      | The theatre collapses toward white; large black text/list content enters. The rounded shape changes scale and role rather than disappearing.                                                                                           | Scroll or close action; reversible container transform.                                                                                                                                         | Makes return feel continuous. Reversible transforms should restore focus and scroll position.                                                                                   | Design entry and exit as one reversible state machine. Do not copy the exact type or geometry.                                                                                 |
| 9–20 s / 000541–001200     | Black contact/representation world with neon green line drawings and giant title. Doodles and relative text placement change while contact facts remain readable.                                                                      | Scroll-linked SVG/canvas drawing and display-text deformation.                                                                                                                                  | Adds a distinct personal chapter without losing rigid contact anchors. Animated strokes and filtered type should be bounded and disabled for reduced motion.                    | Keep practical contact data rigid while expressive decoration moves. Do not copy the green/black palette, drawings, wording, representation claim, or contact layout.          |
| 20–24 s / 001201–001440    | A large black rounded aperture/card collapses against white, preparing the next bright chapter.                                                                                                                                        | Scroll threshold; clip-path/border-radius/scale transition.                                                                                                                                     | Provides a visual hinge between dark and light. Large-radius animated layers can trigger costly painting if not transform-based.                                                | Use a clear threshold object, not many unrelated transitions. Do not copy the rounded black aperture.                                                                          |
| 24–30 s / 001441–001800    | About copy sits beside a narrow dark/video opening. The aperture establishes scale before the text-material sequence.                                                                                                                  | Standard scroll plus bounded video/container transform.                                                                                                                                         | Creates calm setup and spatial continuity. Keep text as semantic DOM.                                                                                                           | Use a quiet setup before a strong interaction. Do not copy content, font, or exact alignment.                                                                                  |
| 30–48 s / 001801–002880    | Giant readable lines scroll vertically. Near a narrow lower-viewport band, glyphs become flattened, viscous, bridged, or droplet-like; above it, text and fixed nav remain sharp. At the end, a small vertical media aperture emerges. | Primarily scroll position, possibly scroll velocity; likely semantic DOM text plus a clipped WebGL/canvas/SVG duplicate, displacement shader, or variable mesh layer restricted to a mask band. | Makes the boundary between reading and media feel physical. Full-page text rasterisation would be expensive and inaccessible; a small effect layer is the safer interpretation. | Deform only non-critical display text, in at most two moments, with readable HTML always present. Do not copy the font, wording, exact melt shape, band position, or aperture. |
| 48–58 s / 002881–003480    | The narrow capsule grows vertically and horizontally into a large project window. Filtered footage becomes dominant.                                                                                                                   | Scroll/click; shared-element transform and video source/state change.                                                                                                                           | Turns the conclusion of the text effect into project entry. Resize the container, not the video decode dimensions every frame.                                                  | Connect two chapters through one existing object. Do not copy the rounded window or footage.                                                                                   |
| 58–73 s / 003481–004380    | Full-screen work state: oversized project list and signature repeatedly reposition over chromatic video; the media remains the spatial ground.                                                                                         | Hover or scroll selection; overlay transforms and video switching.                                                                                                                              | Allows fast browsing with immediate atmosphere. Several preloaded videos would be bandwidth-heavy; load one active source and poster others.                                    | Keep selection text and active media synchronized. Do not copy the list, signature, scanline look, or project material.                                                        |
| 73–80 s / 004381–004800    | Media contracts and shifts, revealing the white intro page underneath.                                                                                                                                                                 | Close/back/scroll; reverse shared-element transition.                                                                                                                                           | Preserves orientation and makes the loop legible. Needs focus restoration and escape support.                                                                                   | Make spectacle escapable and reversible. Do not copy the exact reverse choreography.                                                                                           |
| 80–88.33 s / 004801–005300 | The white opening state returns with the capsule near its initial size and changing content.                                                                                                                                           | Loop/route return.                                                                                                                                                                              | Confirms a complete state loop instead of a one-way demo. Low cost once video is paused outside view.                                                                           | Return to a recognizable base state. Do not reproduce the opening composition.                                                                                                 |

## Elastic-text effect hypothesis

Most plausible architecture:

1. Accessible DOM text remains in normal document flow.
2. An effect copy is rendered only inside a narrow clipping band.
3. Scroll position maps each line’s baseline to a deformation strength.
4. A displacement field compresses vertical space, stretches horizontal counters, and adds small
   detached blobs at peak strength.
5. The effect copy fades or clips away as the DOM line exits the band, so the readable form
   “recovers.”

Cheapest responsible approximation:

- CSS/variable-font transforms for mild compression;
- SVG filter or small canvas/WebGL texture only for the narrow peak band;
- no per-letter DOM mutation on every frame;
- no effect on navigation, body copy, controls, search text, or headings required for orientation;
- static HTML underneath, reduced-motion bypass, and effect disabled on constrained devices.

## Motion vocabulary

- contained media expansion/contraction;
- threshold deformation with recovery;
- rigid-versus-fluid contrast;
- project overlay drift/repositioning;
- reversible light/dark chapter changes;
- quiet fixed navigation over moving media.

## Performance hypotheses

- One active video aperture is much cheaper than several simultaneous scenes if only the selected
  source decodes.
- The scanline/chromatic layer may be CSS/canvas/WebGL post-processing; full-screen filters can be
  expensive on mobile.
- A full-resolution text shader for an 18-second sequence would be unnecessary. The frames support a
  narrow masked effect, not a mandate for a permanent full-screen canvas.
- The capture does not prove text accessibility, selection, searchability, reduced motion, mobile
  behavior, or stable frame rate.

## Unresolved questions

- Is deformation driven by scroll position alone, velocity, pointer, or a combination?
- Is the effect DOM/SVG, canvas, WebGL, or a composite?
- Does the active project replace one video source or crossfade multiple decoders?
- How are keyboard, touch, reduced motion, and focus restoration handled?
