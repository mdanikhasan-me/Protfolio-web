# Direction 01 — Signal Weave

## 1. Concept name

**Signal Weave**

## 2. One-sentence premise

One uninterrupted bundle of round signals changes tension, spacing, and routing so that identity,
navigation, project evidence, and page continuity feel like different states of the same working
system.

## 3. Why it belongs specifically to Anik

Anik's work spans a marketplace, developer tooling, a Discord bot, and a locally trained AI system.
Those outputs look different, but they share a practice: he follows a problem through multiple
layers until the parts work together. The bundle makes that persistence visible without showing a
literal desk, circuit board, or collection of software logos. It also leaves room for his future
interest in interactive games: the same routing law can later become a playable topology problem.

## 4. Governing visual law

The signal is continuous. It may divide into visible strands, compress, cross, widen into an
aperture, or move out of the viewport, but it cannot teleport, dissolve into decoration, or become a
different object between chapters.

## 5. Transformation rule

Scroll progress and explicit selection change a small set of spline control points. Tension first
accumulates near the next content boundary, an aperture opens, project evidence enters, and the
strands settle around the new state. Recovery retraces the same topology in reverse; it is not a
separate wipe.

## 6. Signature silhouette or non-object rule

The silhouette is a wide, asymmetric crossing of four round mineral conduits with one deliberately
quiet opening. It is never a triangle, angular ribbon, letterform, logo lockup, or object posed in
the middle of a chamber. Close views reveal real cylindrical depth, fine surface variation, and
occlusion; distant views read as a strong topological trace.

## 7. Visual hierarchy

The active route or project owns the sharpest strand and brightest local intersection. The primary
heading sits inside a calm interval rather than beside an object. Supporting facts align to strand
entry and exit points. Project imagery receives focus only after selection; all other strands lose
contrast but remain visible as context.

## 8. Typography system

Manrope provides readable display and body text; IBM Plex Mono handles route labels, factual
metadata, and technical evidence. Display type remains rigid. It may be occluded once by a strand or
revealed through an aperture, but its glyphs do not melt or stretch. Long headings wrap on a
controlled measure and keep one stable baseline through system motion.

## 9. Colour logic

Midnight indigo is the identity ground. Mineral cyan signals orientation, saffron signals a pending
transition, berry signals active selection, and violet records a return path. Bright chapters move
to bone while retaining the same four hues at lower area coverage. Colour is state-bearing, not a
per-project cosmetic theme.

## 10. Environmental lighting logic

Light follows tension: relaxed spans receive broad matte light; compressed crossings receive a
narrow rim. When an approved project image enters, its sampled dominant colours may tint only the
nearest strand segments and ambient ground. The system must never invent image colours before real
assets exist.

## 11. Material system

The preferred surface is rounded ceramic/mineral cable: mostly matte, subtly granular, with a small
clear-coat response at tight bends. There is no iridescent glass, chrome-rainbow recipe, holographic
noise, or bloom-heavy black-room finish. DOM and SVG fallbacks render the same system as flat,
round-capped strokes.

## 12. Motion vocabulary

The vocabulary is **tension, pass, open, thread, settle, retrace**. Motion is reversible and
critically damped. Slow input advances the route precisely; high scroll velocity increases temporary
tension but not travel distance. Hover can preview a few pixels of pull; click or keyboard
activation commits the state. No strand moves unless hierarchy or location changes.

## 13. Homepage behaviour

The first viewport begins with a low-density bundle crossing the full viewport and a quiet identity
interval. Navigation gently tensions the relevant strand. Scrolling opens successive bright and dark
chapters while the signal persists at the edge, giving the page continuity without making every
section equally cinematic.

## 14. Project-selection behaviour

Projects are not cards around a central object. Each project is a named crossing on an off-centre
route. Focusing a project tightens that crossing, expands its truthful image slot, and keeps the
previous and next routes legible as subdued continuations. Keyboard focus produces the same visible
state as pointer focus.

## 15. Project-opening behaviour

On activation, the selected aperture expands toward the viewport edge while the bundle threads
behind it. The image plane becomes the incoming case-study media region, and one uninterrupted
strand becomes the case-study progress trace. Opening can resolve into ordinary semantic HTML; it
does not require a second 3D scene.

## 16. Services presentation

The two truthful services become two parallel spans that repeatedly diverge and rejoin around shared
evidence. Their copy stays in accessible HTML. This describes complementary practices without fake
percentages, fake capabilities, or a decorative tool wall.

## 17. Stories presentation

Stories are quieter knots on a chronological line. Date, title, and summary remain stable while a
single strand records reading progress. The composition deliberately reduces material depth and
motion so editorial content can breathe.

## 18. Contact-page mood

The contact state is calm, dark, and direct. Most strands exit the viewport; two clean endpoints
align with contact actions. After the expressive project sequence, this reduction supports a
functional conversation rather than another spectacle. A final return path reasserts continuity
without copying Website 01's giant-word footer.

## 19. Relationship with the Play route

Signal Weave can seed an independently loaded topology puzzle in which the player redirects a pulse
through branching paths under limited moves. It would use no character, grass world, beacon,
compass, discovery counter, or orbital archive. Normal pages show only a static route invitation and
never load the Play bundle.

## 20. Mobile behaviour

Mobile uses two or three SVG strands, one crossing per viewport, and vertical apertures sized to the
real media aspect ratio. Touch targets remain HTML controls above the visual layer. The composition
is redrawn for a narrow viewport, not cropped from desktop, and project context becomes a compact
previous/current/next sequence.

## 21. Reduced-motion behaviour

The system swaps spline interpolation for a 120–160 ms crossfade between authored stable states.
Progress, focus, and route location remain visible through colour, weight, and labels. There is no
parallax, inertial overshoot, autoplay camera motion, or content delayed behind animation.

## 22. No-WebGL fallback

An inline SVG uses the same authored paths and round caps. A static PNG is a final defensive
fallback, but navigation, project selection, case-study opening, and contact remain semantic HTML.
The SVG version is a complete visual direction, not an apology screen.

## 23. Asset plan

- Approved project images, when supplied, with explicit focal-point metadata.
- Four procedural strand materials; no downloaded brand texture.
- One small deterministic grain texture or CSS noise layer.
- SVG stable states for fallback and social previews.
- Existing repository fonts: Manrope and IBM Plex Mono.
- Truthful placeholder label until every project image is approved.

## 24. Blender requirements

Blender is useful for testing close-view cylindrical intersections, self-occlusion, matte surface
response, and camera-safe bend radii. The committed script
`tools/blender/checkpoint2_system_studies.py` creates the study reproducibly; heavy `.blend` files
and renders remain under `.local-validation/blender/`. Production implementation may instead use
generated tubes in Three.js, avoiding a large authored model.

## 25. Image-generation requirements

Image generation is optional and restricted to abstract material/atmosphere exploration. It must not
generate screens, logos, people, copy, or project evidence. The exploration prompt and rejection
decision are recorded in `EXPLORATION_LOG.md`; no generated image is presented as a final asset.

## 26. Runtime risks

Tube geometry can become heavy if curve subdivision is unconstrained; transparency can increase
overdraw; sampling project-image colour can delay first interaction; and pointer-driven control
points can trigger continuous rendering. Caps: four strands, fixed segment budgets, opaque
materials, precomputed colour metadata, render-on-demand outside the short transition, and
route-level lazy loading.

## 27. Accessibility risks

Crossing lines can create visual noise, colour alone cannot identify state, and occlusion can reduce
heading readability. Mitigations are persistent text labels, a protected text contrast region,
visible native focus, no strand crossing over body copy, complete keyboard parity, decorative canvas
hidden from the accessibility tree, and all images receiving factual alt text when supplied.

## 28. Implementation risks

Maintaining continuity across Astro route changes requires a small shared transition state without
holding content hostage. Deep links must begin in a valid settled state. The opening aperture must
map precisely to the destination media region. A proof-of-law prototype should validate those three
constraints before production art is built.

## 29. Exact reference elements deliberately avoided

Website 01's A/triangle, angular ribbon, bowed grid chamber, black iridescent material, mounted
project planes, white-plane opening, giant word separators, and star/A mask; Website 02's capsule,
rounded display face, viscous glyph deformation, doodles, and green-black world; Website 03's
central modular object, fracture/tunnel, smoky rock, lion, verb bands, slit wipe, and orbiting
panels; Website 04's robot/avatar, white stage, grass planet, beacons, discovery HUD, compass, and
orbital archive. The direction also rejects a generic split hero, project-card grid, floating
software screens, fake screenshots, and decorative untracked motion.
