# Hinode City v2 candidate validation

Status: `candidate_awaiting_user_approval`

Automated validation never accepts the visual design. The v1 layout remains retained as
`rejected_visual_layout` and is not the runtime default.

## Current routes

- Playable candidate: `/play/hinode-city/`
- Browser editor: `/play/hinode-editor/`
- Candidate evidence: `/play/hinode-v2-evidence/`
- Candidate progress: `/play/hinode-progress/`
- Handling laboratory: `/play/hinode-handling-lab/`

## Required commands

```text
npm run validate:hinode:topology
npm run build:hinode:candidate
npm run validate:hinode:layout
npm run check
npm test -- --run
npm run test:e2e:hinode
npm run build:astro
npm run capture:hinode
npm run review:hinode
```

The topology validator must run before the candidate builder. It checks exact bounds, connectivity,
accidental dead ends, same-grade crossings, route gradients, structure definitions, and explicit
edge plans.

`capture:hinode` writes only v2 candidate evidence under `public/hinode/review/v2-candidate/`. The
route video is a deterministic viewpoint sweep and must not be described as a continuously driven
lap. Headless Chrome FPS is diagnostic, not an RTX 3070 benchmark.

## Candidate contract

- exact 500 × 350 metre north-up bounds;
- one primary loop, at least two connectors, and exactly two shortcuts;
- connected touge, alley, downtown, port, and waterfront identities;
- a flyover with entrance, deck, exit, deck thickness, offset supports, crash barriers, and declared
  clearance crossings;
- a below-grade underpass with walls, ceiling, maintenance walks, and light sockets;
- explicit left and right edge class, width, drainage, and protection for every route;
- collision volumes plus route-following safety barriers;
- candidate-only topology, hierarchy, elevation, edge, safety, structure, density, driver,
  performance, reference, and video evidence.

## Handling boundary

Current status: `promising_but_requires_manual_tuning`.

This layout checkpoint does not retune drift initiation, counter-steering, grip recovery, weight
transfer, handbrake behavior, surface grip, controller response, or camera response.
