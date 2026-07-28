# Hinode City vertical-slice contract

## Spatial contract

The local slice coordinate boundary is:

- east/west `X`: `-37.5 m` to `+37.5 m`;
- north/south `Z`: `-30 m` to `+30 m`;
- vertical `Y`: metres above the road datum.

The route begins in a `3.2 m` nominal alley, follows a continuous authored curve, reaches a
T-junction, and joins a gently curved `6.2-6.8 m` secondary road. The minimum alley curve radius is
approximately `6 m`. Props and facade collision stay outside the vehicle envelope.

The flyover is approximately `7 m` wide and `6-7.5 m` above the lower road. It is visible from the
alley and secondary-road merge but is not driveable in this slice.

## Vehicle contract

The single fictional coupe is approximately `4.2 m` long and `1.72 m` wide. It has four rotating
wheels, visible steering, headlights, brake lights, restrained paint, and inexpensive visual body
movement. It does not reproduce a licensed car or badge.

Controls:

| Input | Action |
| --- | --- |
| `W` / Up | accelerate |
| `S` / Down | brake and reverse |
| `A`, `D` / Left, Right | steer |
| Space | handbrake and controlled grip reduction |
| `R` | reset |
| `C` | camera distance |
| Escape | pause |

The runtime uses a fixed timestep, speed-sensitive steering, bounded acceleration/reverse, rolling
resistance, mild recoverable drift, continuous corridor collision, reset, and a smoothed chase
camera.

## Visual contract

The target is low-poly and anime-influenced, with strong silhouettes, controlled bevels, layered
facades, restrained texture variation, and readable driving geometry.

The palette is approximately:

- 70% deep navy, charcoal, muted concrete, and dark building surfaces;
- 20% warm shops, windows, streetlights, and baked pools of light;
- 10% restrained red, amber, pale green, and cool sign accents.

There is no generic cyberpunk treatment, asset-pack randomness, square road grid, voxel look,
faceted road curve, copied branding, excessive wetness, heavy fog, depth-of-field concealment, or
motion-blur concealment.

## Acceptance tests

The slice is not complete until:

1. the portfolio build passes and `/play/hinode-preview/` loads;
2. the car accelerates, brakes, reverses, steers, handbrakes, and resets;
3. the chase camera remains readable and does not constantly clip;
4. the car clears the normal alley envelope;
5. props remain outside the driveable corridor;
6. road collision is continuous and the spline has no gaps or faceted turns;
7. the alley connects to the secondary road;
8. the flyover is visible from the intended drive;
9. no rejected game route, asset, or import remains;
10. unrelated public portfolio routes still build;
11. normal visible triangles remain below roughly 180,000;
12. normal draw calls remain below roughly 150;
13. the compressed public Hinode payload remains below roughly 12 MB;
14. measured default-mode performance is smooth on the development system.

## Required evidence

- Blender top-down render;
- road-spline and clearance render;
- alley entrance render;
- alley curve render;
- flyover composition render;
- secondary-road merge render;
- chase-camera browser screenshot;
- turning browser screenshot;
- secondary-road merge browser screenshot;
- short gameplay capture if the available browser tools support it.

Evidence must keep geometry readable and report actual limitations.

