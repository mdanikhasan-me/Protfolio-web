# Direction 02 — Kinetic Ledger

## 1. Concept name

**Kinetic Ledger**

## 2. One-sentence premise

The portfolio is a full-viewport typographic register whose horizontal strata compress at one moving
pressure seam, accept evidence, and recover into a clear reading rhythm.

## 3. Why it belongs specifically to Anik

Anik learns by implementing and verifying systems. A ledger expresses accumulation, comparison, and
proof without turning his work into a corporate dashboard or fake metrics. Its tension between
precise records and temporary pressure fits a solo builder balancing Boilabin, tools, automation,
and a large AI experiment: evidence remains readable even while the system is being pushed.

## 4. Governing visual law

Everything belongs to a shared set of horizontal baselines. One pressure seam may bend, compress, or
release those baselines locally, but type outside the influence zone stays rigid and readable. No
isolated decorative object is allowed.

## 5. Transformation rule

Scroll position moves the seam; scroll velocity changes the width and depth of its local influence.
Letters and media bands approaching the seam compress horizontally, preserve their vertical
registration, cross the seam, and recover with capped overshoot. Selection locks the seam to the
chosen project until opening completes.

## 6. Signature silhouette or non-object rule

This direction has **no central 3D object**. Its signature silhouette is a page-spanning stack of
unequal typographic bands interrupted by one thin vertical seam and a locally displaced set of
baselines. It remains recognisable in black and white, at mobile width, or with all imagery removed.

## 7. Visual hierarchy

One oversized word establishes the chapter, a coloured rule establishes current state, and the
active evidence band owns the largest uninterrupted area. Body copy never enters the deformation
zone. Metadata aligns to stable registers above or below the active band. Negative space comes from
missing bands rather than giant arbitrary margins.

## 8. Typography system

Manrope is both structure and voice; IBM Plex Mono provides stable labels, project facts, and
evidence annotations. Variable-like compression is simulated with measured transforms on duplicate
visual glyph layers while a normal HTML heading remains available and visually recovered. Only this
direction uses obvious elastic deformation. The effect is pressure/compression across horizontal
strata—not melting, dripping, or a liquid capsule.

## 9. Colour logic

Chalk is the main reading surface, near-black carries copy, cobalt identifies route and structure,
vermilion marks active pressure, plum denotes evidence depth, and a restrained yellow marks
recovery. Dark chapters invert chalk and near-black while retaining colour roles. There is no
reference-style green/black contact world.

## 10. Environmental lighting logic

Lighting is graphic rather than cinematic: flat paper, ink-density shifts, and a faint shadow where
one band passes another. The seam can create a narrow high-contrast edge but no glow tunnel. An
approved project image contributes a sampled colour strip to adjacent rules, visibly changing the
register without recolouring the whole page.

## 11. Material system

Materials are paper, opaque ink, and occasional translucent proof overlay. Fine fibre noise is
allowed at low opacity. There is no chrome, glass, gelatinous capsule, neon panel, or photoreal
object. The visual system is designed to be native HTML, CSS, SVG, and optional Canvas 2D.

## 12. Motion vocabulary

The vocabulary is **register, press, compress, transfer, stamp, release, align**. Movement remains
on one axis except for a small baseline deflection at the seam. Overshoot is short and proportional
to input velocity. Media enters by inheriting an empty band, not by floating over the page.

## 13. Homepage behaviour

The first viewport is an asymmetrical stack: identity occupies two broad rows, role and location sit
on a stable factual line, and route labels occupy narrow rails. As the user scrolls, the seam moves
through the ledger and exposes the next chapter. The page can alternate chalk and near-black states
without changing the law.

## 14. Project-selection behaviour

Projects are full-width evidence bands in a vertical register, not cards. Focus thickens the chosen
band, reveals its title and verified technology label, and transfers its future image colours into
two adjacent rules. The selected band never invents a screenshot; it displays
`[PROJECT IMAGE — PENDING]` until approved media exists.

## 15. Project-opening behaviour

The selected media band expands vertically while the seam holds its left or right crop boundary.
Sibling bands compress to contextual lines. After the band fills the viewport, the seam becomes a
case-study reading-progress marker and the destination remains normal HTML.

## 16. Services presentation

Website development and custom software development receive two stable columns only after the
expressive identity section. Their shared baselines make overlap visible while separate proof rows
keep scope honest. No skill bars, percentages, invented volume, or false delivery claims are used.

## 17. Stories presentation

Stories use a calm chronological register with generous line spacing and almost no deformation.
Month, title, and subject share one row; opening a story creates a reading band while the index
remains as a faint stable baseline.

## 18. Contact-page mood

Contact is bright, matter-of-fact, and fast. The seam settles near an edge; two contact paths occupy
large native controls; availability and location appear only if approved. The composition ends on
aligned baselines rather than a giant copied wordmark or spectacle.

## 19. Relationship with the Play route

The normal portfolio can point to a separately loaded typographic rhythm challenge in which players
align moving registers under constraints. This is viable but intentionally less spatial than
Direction 01 or 03. The Play bundle must remain isolated and the normal route only shows a static,
accessible invitation.

## 20. Mobile behaviour

The seam becomes a thumb-reachable vertical rule; display words break into two or three authored
rows rather than scaling to illegibility. Project bands use the full screen width. Local deformation
is capped to roughly two characters, and navigation opens as a stable typographic register with
44-pixel targets.

## 21. Reduced-motion behaviour

The seam changes position instantly or with a 120 ms opacity transition; affected letters use a
pre-authored compressed still and then a recovered still. No scroll-velocity sampling is active.
Colour rules and band thickness continue to communicate selection, progress, and chapter.

## 22. No-WebGL fallback

No WebGL is required. Core presentation is semantic HTML/CSS. SVG supplies curved baseline masks and
Canvas 2D may add the live deformation only after capability and motion-preference checks. With all
enhancement disabled, the typographic composition remains the intended design.

## 23. Asset plan

- Existing Manrope and IBM Plex Mono fonts.
- Approved project images with safe-crop metadata.
- Small paper-fibre texture or CSS-generated grain.
- Authored SVG seam paths for key stable states.
- Optional precomputed colour tokens from approved project images.
- No GLB, human image generation, stock UI, or third-party logo montage.

## 24. Blender requirements

Blender is not required and using it would undermine the direction's native typographic strength.
Any Blender exploration is therefore rejected rather than forced into the concept. The technical
proof should be a DOM/SVG/Canvas prototype with real text metrics and assistive-technology checks.

## 25. Image-generation requirements

Image generation may explore abstract paper, pressure, and ink strata only. It cannot generate
letters, screens, logos, or project evidence. Because embedded generated text is especially
unreliable, the final typography board is fully deterministic SVG and uses repository fonts.

## 26. Runtime risks

Per-glyph DOM spans can create layout and accessibility problems; continuous scroll-velocity
sampling can consume the main thread; large clip paths can repaint; and font loading can shift
metrics. Mitigations are a separate decorative glyph layer, one semantic heading, fixed text
metrics, requestAnimationFrame throttling, a short active region, and static states offscreen.

## 27. Accessibility risks

Compression can reduce legibility, reordered visual words can differ from DOM order, and the seam
can cross focus rings. The effect is disabled for body copy and long headings, accessible text stays
untransformed, DOM order remains reading order, focus elements occupy stable rails, zoom at 200%
uses a fully settled state, and forced-colours mode receives plain borders.

## 28. Implementation risks

The concept depends on excellent typography; small metric errors would look accidental.
Cross-browser font shaping and clip behavior need an early proof. The seam must not become a
scroll-jacking mechanism. Project colour transfer must be deterministic and derived only from
approved assets.

## 29. Exact reference elements deliberately avoided

Website 01's transforming A/ribbon, chamber, iridescent material, project planes, giant word
separators, and spatial mask; Website 02's rounded display font, capsule proportions, doodles,
green-black palette, exact viscous glyphs, melt timing, and media aperture; Website 03's modular
object, giant verb-band sequence, slit wipe, orbit, and smoky world; Website 04's character, white
stage, game environment, HUD, beacons, and orbital archive. The direction also avoids a dashboard,
beige editorial template, fake statistics, generic project cards, and a text-left/object-right hero.
