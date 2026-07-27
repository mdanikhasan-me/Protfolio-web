# Checkpoint 2 — three original immersive art directions

Status: **concept review only**. No public route, production component, final public copy, or Play
implementation changed in this checkpoint.

## Directions

| Direction             | Governing law                                               | Start here                                             |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| 01 — Signal Weave     | One continuous signal changes role under tension            | [`direction-01/CONCEPT.md`](./direction-01/CONCEPT.md) |
| 02 — Kinetic Ledger   | A pressure seam reorganises typographic strata              | [`direction-02/CONCEPT.md`](./direction-02/CONCEPT.md) |
| 03 — Constraint Field | Invisible rules become legible through many small responses | [`direction-03/CONCEPT.md`](./direction-03/CONCEPT.md) |

Cross-direction trade-offs: [`CONCEPT_COMPARISON.md`](./CONCEPT_COMPARISON.md).

## How to review a direction

Open the five SVG boards directly in a browser or the repository preview:

1. `desktop-experience-board.svg` — eight separate 16:9 states: first viewport, transformation,
   bright chapter, dark chapter, selection, opening, calm Contact, and return.
2. `mobile-experience-board.svg` — eight 390 × 844 intent studies including real mobile reflow,
   reduced motion, and no-WebGL.
3. `motion-storyboard.svg` — fourteen sequential visual frames. Read its exact timing and semantics
   in `MOTION_STORYBOARD.md`.
4. `signature-system-contact-sheet.svg` — eight functional jobs performed by one system.
5. `typography-study.svg` — eight hierarchy and behavior tests.

Then read:

- `TECHNICAL_FEASIBILITY.md` for explicitly unmeasured budgets and fallback tiers;
- `ORIGINALITY_AUDIT.md` for the four-reference and do-not-copy test;
- `EXPLORATION_LOG.md` for rejected variants and the effect of Blender/ImageGen inspection.

View boards at both fit-to-window and 100% zoom. At 100%, inspect whether project placeholders stay
truthful and legible, small labels remain readable, the signature has meaningful close detail, and
the calm states genuinely reduce density.

## Generated and reproducible work

- `tools/concept/generate_checkpoint2_boards.mjs` regenerates all fifteen committed SVG boards.
- `tools/blender/checkpoint2_system_studies.py` reproduces local Signal Weave and Constraint Field
  close-material studies in Blender 5.2.0 LTS.
- Heavy Blender files, generated atmosphere studies, rendered captures, and discarded variants stay
  ignored under `.local-validation/`.

The visual boards use concept-study language only. Project evidence remains labelled
`[PROJECT IMAGE — PENDING]` until Anik supplies and approves real assets.
