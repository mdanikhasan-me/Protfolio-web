# Pointer strength and fluid input, October 9

The owner reports that direct pointer movement is weak/late with reduced motion
both enabled and disabled. Equal behavior between those settings was not proof
of matching the reference. Source/build checks are not user acceptance.

Evidence root: `D:/Portfolio Evidence/current-20261009/`.
Rollback source copies and bounded capture scripts are in the workspace-level
`.codex-local/maintenance-20261009/` directory, outside production dependencies.

## Rotation factor

The isolated sweep measured about 32.52 degrees locally versus 107.86/118.66 on
the live reference. Raise pointer impulse strength fourfold while keeping the
existing time integration, radial response, return-to-rest and reduced-motion
composition. Do not alter the protected GLB or lettering.

`pointer-isolated-strength-after` measures 9.15 degrees at 0.25 seconds and 39.77
at 0.5 seconds, versus approximately 11.54 and 43.39 for the reference. Its normal
and reduced-motion local results agree.

`pointer-paths-uninterrupted-strength4` has 14 uninterrupted runs: seven paths on
each site, under reduced motion. Local/reference peak angular excursions in degrees:

| Path | Local | Reference |
| --- | ---: | ---: |
| Horizontal | 139.155 | 137.677 |
| Fast reversal | 42.3225 | 42.3225 |
| Vertical | 77.855 | 69.608 |
| Diagonal | 79.147 | 81.125 |
| Circle | 149.990 | 152.160 |
| Tip | 178.854 | 177.709 |
| Outer edge | 178.853 | 177.702 |

No console errors, initial orientations all zero. Retain provisionally: much closer
input strength. Timing differs between browser runs and displayed quaternion values
are rounded. These headless input traces do not establish native FPS or every-frame
parity. The earlier `pointer-paths-strength4` capture pauses for screenshots during
the coast period; exclude those coast peaks from comparison. The initial headed
reduced-motion baseline was contaminated by a nonzero starting pose; exclude it.

The numerical timing regression covers 30, 60, 120, 144 and 240 Hz, requiring prompt
response, finite orientation, return to rest and bounded strength variation.

## Fluid accumulator factor

Change only the pointer-impulse accumulator retention from time-scaled 0.5 to 0.5
per update. Input is queued per rendering callback; time-scaling retention alone
amplified its sum on this high-refresh setup. Field advection/decay are unchanged.

`fluid-uniforms-before` recorded peak input 0.588213 locally versus 0.212767 reference.
`fluid-uniforms-after` records 0.206934 versus 0.201225. Both main canvases use the
same 2550x1217 backing dimensions at 2040x974 CSS and DPR 1.25. These are instrumented
WebGL uniform traces, not runtime-performance measurements. After screenshots were
reviewed individually; the broad shape, texture, backdrop and word projection still
differ. Retain this narrow accumulator correction without claiming those are solved.

Native all-frame comparison and material/shape/lettering corrections remain open.
