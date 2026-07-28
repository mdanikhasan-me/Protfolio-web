# Hinode City clean-room audit

Status: active vertical-slice checkpoint  
Branch: `rebuild/hinode-from-zero`

## Clean-room boundary

Hinode City is a new implementation. No previous game code, art, Blender source, exported model,
road, vehicle, camera, physics, collision, interface, screenshot, render, audio, test artifact, or
local production script is an input.

The retained foundation is limited to the portfolio's Astro and TypeScript application, general
pages and content, build and test configuration, accessibility infrastructure, unrelated shared
utilities, installed dependencies that are useful to the new implementation, the new written brief,
and the four supplied Hinode concept images.

The mistaken preservation directory and branches were removed before this branch was created:

- external backup `hinode-checkpoint1-20260728-214814`: absent;
- `archive/immersive-portfolio-v4-pre-hinode-20260728`: absent locally and remotely;
- `rebuild/hinode-web-racer`: absent locally and remotely;
- five rejected preservation-planning documents: absent.

## Rejected-game removal

The clean branch contains no rejected `/play/` route, public game model, game stylesheet, game layout,
gameplay script, vehicle/camera/collision helper, old Blender generator, game-specific local source,
or game-generated visual artifact.

The following locations are reserved for the new work and must never import from rejected paths:

```text
art/blender/hinode/
art/references/hinode/
public/hinode/
src/hinode/
src/pages/play/hinode-preview/
tools/blender/hinode/
tools/validation/hinode/
tests/unit/hinode/
tests/e2e/hinode/
```

## Approved reference roles

The four supplied images are stored outside `public/` and are visual guidance only:

1. `hinode-overview-map.png`: compact district layering and visible road hierarchy.
2. `hinode-road-hierarchy.png`: smooth road classes, curvature, widths, and connector language.
3. `hinode-alley-modules.png`: alley clearances, modular frontage, and prop exclusion.
4. `hinode-alley-driving.png`: alley density, warm frontage, secondary-road merge, and visible
   flyover composition.

Text, measurements, brands, vehicle likenesses, and Japanese lettering visible inside generated
images are not authoritative. The written specification controls. The new implementation uses
fictional shops, graphics, and a completely original car.

## Checkpoint boundary

Only a `75 m × 60 m` vertical slice is authorised. It includes one driveable alley, a smooth curve,
a T-junction, a wider secondary road, a visible but non-driveable flyover, a short canal edge, six
to eight modular buildings, restrained props, one original coupe, a chase camera, real controls and
collision, baked environmental lighting, a loading state, and a temporary speed display.

The mountain, port, full downtown, island, complete loop, traffic, pedestrians, missions, garage,
minimap, homepage integration, deployment, and complete city are explicitly outside this checkpoint.

## Commit separation

The branch records separate commits for cleanup, rejected-game removal, clean scaffold, Blender
slice, browser runtime, and validation evidence. Unrelated portfolio work is never staged as Hinode
work.

