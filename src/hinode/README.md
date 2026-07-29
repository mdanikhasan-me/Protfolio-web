# Hinode browser implementation

Hinode is an isolated browser racing implementation inside the portfolio application.

## Authoritative systems

- `map/city-layout.ts` validates and measures the versioned 500 × 350 metre layout.
- `map/city-scene.ts` builds the shared editor/runtime road, footpath, drainage and proxy scene.
- `editor/` owns layout transforms, history, import/export and planning overlays.
- `handling/` contains the 120 Hz Rapier rigid-body foundation and custom tyre-force model.
- `game/` contains the connected city runtime, checkpoints, minimap and three chase cameras.
- `core/driving-input.ts` owns keyboard and gamepad response.
- `vehicle/handling-model.ts` owns original Hinode handling curves and tuning.

The active routes are:

- `/play/hinode-handling-lab/`
- `/play/hinode-editor/`
- `/play/hinode-city/`
- `/play/hinode-progress/`
- `/play/hinode-preview/` redirects to the replacement city.

Public graphics choices are exactly High and Low. The complete city remains a road-first approval
proposal: buildings, skyline, vegetation, signs and future props are proxies. No building interior
is modelled.

The attributed runtime vehicle is `VEH_MAH_Nightline_R34_Derivative`, presented as **MAH
Nightline**. Rights and modification records live in `ATTRIBUTION.md`,
`LICENSES/ARIFIDO_R34_CC-BY-4.0.md` and the vehicle manifest.
