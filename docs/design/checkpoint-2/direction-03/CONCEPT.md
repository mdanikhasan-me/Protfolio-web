# Direction 03 — Constraint Field

## 1. Concept name

**Constraint Field**

## 2. One-sentence premise

Hundreds of small independent marks reveal an otherwise invisible spatial rule by how they orient,
clear paths, remember prior movement, and reorganise around real project evidence.

## 3. Why it belongs specifically to Anik

Anik's practice is made of many small implementations: bot commands, marketplace flows, UI states,
training steps, and integrations. Their value appears when constraints make them coherent. The field
expresses that systems-level attention without a literal circuit or central logo. It also connects
practical software with future interactive experimentation because rules can be seen, changed, and
eventually played.

## 4. Governing visual law

No mark moves arbitrarily. Every mark samples the same small set of forces: route flow, content
repulsion, project attraction, and recent-path memory. The marks are evidence of the environment;
they are not confetti or a particle wallpaper.

## 5. Transformation rule

Entering a chapter introduces or removes one spatial constraint. The field first anticipates the
boundary, forms a readable corridor, lets content or media occupy the corridor, and slowly records a
faint wake after passage. Project focus turns the image rectangle into a boundary condition that
changes nearby direction, density, and colour.

## 6. Signature silhouette or non-object rule

There is no logo-like hero object. The signature is a broad asymmetric current surrounding a
recognisable calm void. At close range it is made from short rice-grain or rounded-prism marks with
individual direction. At distance those responses combine into a memorable flow and negative-space
shape.

## 7. Visual hierarchy

The calmest void holds the primary heading or active evidence. Dense, high-contrast marks identify
an approaching transition. One coloured attractor denotes current route state. Secondary facts sit
on straight content corridors where the field has already settled. Hierarchy therefore comes from
the relation between density and calm, not from panels.

## 8. Typography system

Manrope remains rigid and occupies protected negative-space corridors. IBM Plex Mono supplies labels
and factual metadata. Type never melts. Chapter headings may be progressively revealed by marks
turning away from their bounding shape, but glyph geometry and HTML remain untouched. On mobile and
reduced motion, headings appear in pre-cleared corridors.

## 9. Colour logic

Storm blue is the base environment, ricepaper is the primary text, mist identifies calm navigable
flow, clay marks active constraint, gold records memory, and a muted periwinkle can mark return.
Bright chapters invert to ricepaper with low-density storm marks. An approved project image may
locally tint the field, never the entire brand.

## 10. Environmental lighting logic

The field uses grazing light so each small mark has a soft directional face. Local attractors
increase rim intensity; calm reading corridors remain matte. When imagery appears, a narrow band of
its verified colour palette propagates outward with distance falloff, demonstrating that evidence
changes the environment rather than floating above it.

## 11. Material system

Desktop enhancement may use soft mineral or fibre prisms with opaque surfaces. The underlying
language is still drawable as Canvas or SVG line segments. There is no grass, star field, smoky
rock, chrome module, luminous beacon, or particle explosion. Texture is subordinate to vector
direction.

## 12. Motion vocabulary

The vocabulary is **sample, turn, clear, gather, route, remember, settle**. Marks rotate before they
translate; translation is short and constrained. Force changes ease through velocity damping.
Pointer movement can perturb a tiny radius, but navigation and project selection create the
meaningful global states.

## 13. Homepage behaviour

The first viewport begins nearly still, with a broad current and a protected identity corridor.
Route focus bends only the relevant region. Scrolling introduces new constraints, shifting between
storm-dark and ricepaper-bright environments while headings remain stable. The field becomes sparse
on factual sections and dense only at authored transitions.

## 14. Project-selection behaviour

Each project is a boundary in the field index. Focusing it opens a rectangular or irregular calm
region sized for its real image aspect ratio; nearby marks rotate, make space, and acquire sampled
project colour. Previous and next projects remain legible as distant currents rather than generic
cards.

## 15. Project-opening behaviour

Activation expands the selected boundary into a content corridor. The field flows around the growing
media region, then settles as a low-cost edge treatment on the case study. On return, its remembered
wake guides the viewport back to the exact selected boundary.

## 16. Services presentation

Two constraints create two distinct flow families for website development and custom software
development. Shared marks between them identify overlap; dedicated evidence regions describe
differences. The actual service language remains clear HTML without invented claims or labelled
workshop objects.

## 17. Stories presentation

Stories become dated disturbances along a quiet reading path. The field density is low; opening a
story causes only a short local turn and leaves a subtle memory trace. This offers continuity while
allowing long-form text to dominate.

## 18. Contact-page mood

The environment settles into sparse horizontal rows that guide the eye toward two direct actions.
Motion ceases after entry, the attractor dims, and only a faint previous-path wake remains. The mood
is calm, trustworthy, and functional rather than game-like.

## 19. Relationship with the Play route

This is the strongest direct Play foundation. A separately loaded flow-field puzzle can let the
player position a limited set of constraints to route a pulse through goals. The mechanic requires
no humanoid avatar, grass planet, beacons, discovery counter, compass, or archive orbit. Normal
pages share only the visual law and a static invitation; they never load game code.

## 20. Mobile behaviour

Mobile samples the field down to roughly 60–120 SVG or Canvas marks and emphasises one vertical
current. Content corridors occupy most of the viewport; marks never sit behind body copy. Touch
interaction uses HTML controls and optional small-radius feedback. Low-memory devices receive
pre-authored SVG states.

## 21. Reduced-motion behaviour

Marks do not simulate. The page switches between stable sampled fields with a short opacity change,
or displays one static field per chapter. Selection is communicated by a visible boundary, label,
and colour. Return location remains exact without animated wakes.

## 22. No-WebGL fallback

Canvas 2D or inline SVG can draw deterministic line segments from the same precomputed field data.
The lowest tier uses one lightweight static SVG per chapter. Navigation, media, project opening,
Stories, and Contact remain native HTML in every tier.

## 23. Asset plan

- Deterministic field seed and constraint definitions stored as data.
- Approved project images plus focal points and sampled colour tokens.
- One optional soft-normal texture for 3D marks.
- Precomputed SVG stable states for mobile, reduced motion, and no WebGL.
- Existing Manrope and IBM Plex Mono fonts.
- No stock particles, space textures, generated UI, or fake screenshots.

## 24. Blender requirements

Blender is useful for testing close-up prism scale, grazing light, density, and whether individual
marks still read as one environment. The reproducible study script generates a deterministic field
under `.local-validation/blender/`; the large `.blend` and render remain ignored. A production field
should be generated at runtime with instancing or precomputed as SVG rather than shipping the study.

## 25. Image-generation requirements

Image generation may test abstract atmosphere and surface response only: many small non-biological
marks disclosing an invisible vector field. Prompts explicitly exclude text, UI, people, grass,
beacons, planets, and orbital imagery. Generated output is exploratory evidence, not a project
asset.

## 26. Runtime risks

Large point counts can increase draw calls or vertex work, alpha marks can overdraw, pointer fields
can force continuous rendering, and resizing can recompute too much. The plan uses instancing or one
batched geometry, opaque marks, fixed authored constraints, spatially limited pointer influence,
precomputed mobile fields, and render-on-demand after settling.

## 27. Accessibility risks

Dense marks can reduce contrast or resemble visual noise; motion can trigger vestibular discomfort;
and a canvas may obscure semantic relationships. Protected content corridors, zero marks behind body
copy, motion-preference gating, a decorative hidden canvas, explicit text state, complete keyboard
controls, and a high-contrast static mode address those risks.

## 28. Implementation risks

An undisciplined force simulation would look like a generic particle demo. The field needs authored
stable states, deterministic constraint data, and strict transition caps before polishing. Image
colour sampling must be build-time or metadata-driven. Play must reuse the law without sharing its
bundle or turning the normal portfolio into a game.

## 29. Exact reference elements deliberately avoided

Website 01's A/triangle, angular ribbon, bowed grid chamber, iridescent material, project planes,
white opening, and giant-word separators; Website 02's capsule, doodles, rounded font, viscous type,
and green-black world; Website 03's modular object, tunnel fracture, lion, smoke, orbital panels,
verb bands, and slit wipe; Website 04's robot, white stage, grass environment, stars, beacons,
glowing diamond, light columns, discovery HUD, compass, and orbital archive. The direction further
rejects generic particle wallpaper, cyberpunk data panels, arbitrary floating screens, and a central
decorative 3D prop.
