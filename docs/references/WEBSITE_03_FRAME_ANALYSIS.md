# Website 03 frame analysis

- Source: `Website 3`
- Indexed evidence: 3,958 source frames at 1920 × 1080
- Timing basis: 60 fps assumption

## Reading

Website 03 contributes orchestration more than a visible identity to borrow. A dark modular object
persists through the hero and statement, then conventional bright evidence sections take over. Later
dark service, light orbital-project, and contact states alternate through decisive wipes and shared
object/camera state. The contrast rhythm is the system; the lion, object, wording, and layouts are
brand-specific.

## Sequence map

| Time / frames              | Visible state; moving elements; stable elements                                                                                                                                                          | Likely input / implementation                                                                   | Motion purpose / performance implications                                                                                                 | Transferable principle / prohibited direct copy                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0–4 s / 000001–000240      | Pale grey loading/identity construction leads into a black shell. Logo and cookie prompt appear before the main world.                                                                                   | Initial load; DOM loader followed by canvas activation.                                         | Avoids showing an unfinished scene, though long blank loading is risky. Loader must expose progress/fallback truthfully.                  | Stage heavy media only when necessary. Do not copy loader, logo, or black shell.                                                      |
| 4–15 s / 000241–000900     | Dark hero with “Designed to mean,” thin guide lines, sparse side facts/CTA, and a transparent extruded angular object. The object expands and fractures toward a tunnel while interface anchors remain.  | Pointer hold/drag and/or scroll; WebGL mesh fragments, camera movement, transparency and bloom. | Couples headline meaning to material response. Transparent fragments and post-processing are GPU-heavy.                                   | Coordinate copy state and object state. Do not copy the central object, headline, instructions, composition, or materials.            |
| 15–23 s / 000901–001380    | The same 3D field persists while statements and huge horizontal verbs move through normal page flow. Object fragments remain active behind/around content.                                               | Scroll; DOM text synchronized with a persistent WebGL timeline.                                 | Carries identity into narrative without repeating a hero. Canvas should pause or simplify when obscured by text.                          | Let one state persist across adjacent chapters. Do not copy the verbs, typography bands, or tunnel.                                   |
| 23–33 s / 001381–001980    | Bright facts/cards and a moving selected-work rail replace the dark world. Lion and project imagery dominate; central project is large with cropped neighbors.                                           | Scroll/drag horizontal carousel; DOM/image sections.                                            | Supplies readable proof and comparison after abstraction. Images need responsive delivery; carousel needs non-drag controls.              | Alternate expressive and evidence modes deliberately. Do not copy claims, lion imagery, card styling, rail geometry, or metrics.      |
| 33–40 s / 001981–002400    | Dark service environment with huge stacked AI/DESIGN/DEVELOPMENT/BRANDING words, smoky background, and a rock-like object. White slits then wipe into a bright 3D orbital carousel of web-design panels. | Scroll thresholds; scene/material swap, clipping wipe, WebGL or 3D CSS carousel.                | Makes service-to-work state change feel authored. Multiple 3D scenes should not coexist in memory; orbiting panels need a list fallback.  | Use a shared transition state to change world and task. Do not copy the service list, rock, smoke, wipe, orbit, or panel arrangement. |
| 40–44 s / 002401–002640    | Dark contact/footer chapter, comparatively still and direct.                                                                                                                                             | Standard scroll/route.                                                                          | Provides recovery and action after movement. Low cost.                                                                                    | Make action states calmer than showcase states. Do not copy the contact treatment.                                                    |
| 44–48 s / 002641–002880    | Contact route loads grey, then striped image/lion wipes rapidly through a dark form, bright FAQ, and footer. Frames 2859–2876 are machine scene peaks.                                                   | Route transition, scroll, or menu selection; striped clip/mask and DOM state swap.              | Compresses several contact states into a decisive transition. Fast contrast cuts need reduced-motion handling and must not disrupt focus. | Keep route transitions short and stateful. Do not copy the lion, stripe wipe, FAQ layout, or exact timing.                            |
| 48–57 s / 002881–003420    | Dark contact form returns, then a bright lion hero with a right slide-out menu. Form/menu stay conventional over expressive imagery.                                                                     | Route/menu interaction; DOM form and off-canvas navigation.                                     | Shows that practical UI can remain ordinary inside an art-directed shell. Forms require full semantic and error-state QA.                 | Keep forms and navigation conventional. Do not copy the imagery, menu placement, or fields.                                           |
| 57–61 s / 003421–003660    | Bright contact state continues with panels/menu; motion is restrained relative to earlier scenes.                                                                                                        | Menu/scroll.                                                                                    | Sustains task focus. Low-to-moderate cost.                                                                                                | Reduce motion as user intent becomes transactional. Do not copy composition or brand.                                                 |
| 61–65.97 s / 003661–003958 | Grey “HOME” loading state returns, followed by the dark hero/object. The narrative closes its loop.                                                                                                      | Home navigation; scene reinitialization or persisted state restore.                             | Makes return recognizable. Reinitialization should avoid a second long blank load.                                                        | Close on a learned base state. Do not copy the hero, object, or loading treatment.                                                    |

## Shared-state model

The likely high-level states are:

1. loader;
2. dark identity/object;
3. bright facts and selected work;
4. dark services;
5. bright spatial project experiment;
6. calm contact;
7. return to identity.

The useful lesson is coordination: background, object, headline, contrast, and content density
change together. The site is not effective because every section has an unrelated effect.

## Motion vocabulary

- object fragmentation and tunnel expansion;
- oversized horizontal word movement;
- hard dark/bright contrast changes;
- project-rail translation;
- slit/stripe wipes;
- orbital panel motion;
- off-canvas menu entry;
- deliberate still contact states.

## Performance hypotheses

- Persistent transparent geometry and smoke/post effects imply substantial GPU work in dark states.
- Bright evidence sections could unload or suspend those scenes rather than rendering behind opaque
  content.
- The orbital carousel is an optional enhancement; the information must exist as a normal list/grid.
- The recording provides no mobile, accessibility, frame-time, memory, thermal, or context-loss
  evidence.

## Unresolved questions

- Does one canvas change scenes, or are multiple canvases mounted per section?
- Which sequences are scroll-scrubbed versus pointer-triggered?
- Is the orbit real 3D, CSS 3D, or pre-rendered media?
- Are loader durations genuine network/GPU waits or authored transitions?
- How does the form work without motion and JavaScript?
