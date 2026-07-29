# Hinode City validation

## Current routes

- Handling: `/play/hinode-handling-lab/`
- Editor: `/play/hinode-editor/`
- Playable city: `/play/hinode-city/`
- Approval package: `/play/hinode-progress/`
- Compatibility preview: `/play/hinode-preview/` redirects to the playable city

## Required commands

```text
npm run validate:hinode:layout
npm run typecheck
npm run lint
npm test
npm run test:e2e:hinode
npm run build:astro
npm run capture:hinode
npm run review:hinode
```

`capture:hinode` uses the installed Google Chrome through Playwright. It produces current High/Low
driving captures, editor overview and overlays, driver/chase views for all five districts and both
infrastructure features, and three browser videos. `review:hinode` verifies all required evidence
and writes the ignored live status manifest.

Automated Chrome evidence is distinct from manual driving approval. Headless FPS is diagnostic and
must not be presented as an RTX 3070 benchmark.

## Layout contract

The authoritative JSON must remain exactly 500 × 350 metres and contain:

- one primary loop;
- at least two connectors;
- exactly two shortcuts;
- a visible flyover and below-grade underpass;
- a footpath/drainage plan for every road;
- proxy parcels, vegetation zones and sign zones;
- the actual runtime collision volumes;
- five district views plus flyover and underpass review views.

The editor camera remains free. Transform controls may disable orbit only during an active gizmo
drag and must restore it immediately afterward.

## Approval boundary

Passing validation proves the technical checkpoint contract. It does not approve final district art,
final vegetation, signs, skyline, materials, lighting or handling feel.
