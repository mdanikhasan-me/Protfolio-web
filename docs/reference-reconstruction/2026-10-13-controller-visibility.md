# Controller visibility - October 13

## Request and reference distinction

The user explicitly wants the right controller only in the opening, absent after
scrolling into the project section. Live reference inspection found a difference
from the user's description: its quaternion panel remains visible in Works and
hides at Mission. Saved reference DOM and screenshots establish this. This change
follows the user's top-only preference; it is not claimed as exact reference parity.

## Change

`src/scripts/reference-opening-locked.ts` now hides the entire right telemetry
panel using the existing opening interaction boundary: scrollY < 1.25 * innerHeight.
Outside that range the panel is hidden and inert, both buttons are disabled, and
readout/SVG updates are skipped. Returning to the opening restores interaction.
The sculpture animation, material, camera and background are unchanged by this factor.

## Evidence and decision

Root: `D:/Portfolio Evidence/controller-visibility-20261013`.
Narrow rollback: `before-reference-opening-locked.ts` (restore only this factor's
diff, not unrelated changes). `before-reference-locked.css` is an unchanged snapshot.

- `reference-works.json` / `.png`: reference at scroll 3016, section Works,
  quaternion visible, opacity 1. `reference-mission.json`: scroll 9604.8,
  Mission, visible false and opacity 0.
- `local-before-works.png`: controller visibly lingered in local Works.
- `local-states.json`: six live observations at a 974px viewport height.
  Top (0), return to top (0), and opening (973.6) are visible and enabled.
  Works (3232), lower page (10047.2), and after boundary (1363.2) are hidden
  with both buttons disabled. Focus was on Reset before crossing the boundary;
  afterward no focus remained inside the hidden panel.
- Reflected inert attribute checked true below the opening and false on return.
  Accessibility observation confirms controller/reset disappear across the boundary.
  Clicking Reset after return restored the displayed quaternion to 0, 0, 0, 1.
- `local-after-top.png`, `local-after-works.png`, `local-after-lower.png`,
  `local-after-boundary.png`: rebuilt preview screenshots.
- `build.log`: production build, Astro and ESLint passed. Existing large-bundle
  advisory remains. Live browser error log returned no entries.
- `manifest.json`: source, built opening module and evidence SHA-256 provenance.

Accepted for this scoped desktop visibility request. This does not close all
controller ring/axis interactions, mobile/reduced-motion checks, background,
white palette/response regimes, whole-site performance or native frame parity.
