# Salty Steak card and reload behavior

User supplied `C:/Users/anikh/Downloads/ChatGPT Image Oct 1, 2026, 08_46_54 AM.png`
and requested that the fourth project become Salty Steak in second position, using that image.
The spelling follows the supplied artwork. Preserve existing route `/lab/salty-potato-ai/`.

- New 1600px and 960px WebP assets retain the supplied artwork, with no generative edits.
- Homepage and Works archive order: Boilabin, Salty Steak, SoctuKit, UIU Discord Bot.
- Visible name references updated; card description identifies a Windows local AI workspace.
- Reloads set browser scroll restoration to manual before restoration, reset to the top on
  pageshow, and synchronize the homepage Lenis controller through a dedicated event.
  Reset is scoped to reload navigation, not ordinary anchor navigation.

`npm run build` passed. Connected Edge browser verified the new image on the second card,
the Works archive ordering, and the renamed detail page. Reload from homepage scrollY4273.6
with `#selected-work` settled at 0; Works reload from scrollY1000 settled at 0. The reload API
returned before completion in one case; the settled readyState=complete observation is the result.

Evidence: `.reference-local/recovery-20260929/salty-steak-update/verification.json` and screenshot
`C:/Users/anikh/.codex/scratch/portfolio-recovery-20260929/salty-steak-update/second-project.png`.
Protected GLB hash unchanged. No push/deploy. Broader visual/parity audit remains open.

## Refresh placeholder flash

User subsequently rejected the blue CSS grid visible before WebGL initialization. Removed that
temporary gradient/grid background and use black before the real render. Added `data-frame-ready`
only after compositor output has visible content; opening UI and orientation widget remain hidden
until then (model error state excluded). `modelReady` remains shader/asset readiness, distinct from
display readiness. The requested startup reveal and loaded material effects are preserved.

`startup-flash-check.mjs` deliberately delayed the GLB response in isolated browser tests. Normal
and reduced-motion modes both showed no background image, black background, hidden unfinished UI,
then visible controls after readiness. Reload from y3000/y2895 returned to 0; zero page errors.
Evidence under `C:/Users/anikh/.codex/scratch/portfolio-recovery-20260929/startup-flash-fix/`:
report, loading/ready screenshots, diagnostic videos. Primary inspected normal loading and ready
images. Build passed, protected GLB hash unchanged. This is scoped flash regression evidence,
not native all-frame reference parity.
