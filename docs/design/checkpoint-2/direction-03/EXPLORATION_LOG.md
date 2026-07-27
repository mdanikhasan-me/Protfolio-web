# Constraint Field exploration and rejection log

Heavy experiments remain ignored in `.local-validation/`; the committed boards use deterministic,
inspectable SVG marks.

## Explored variants

| Variant                                                                | Medium                    | Decision                                    | Reason                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Cursor-chasing particle cloud                                          | Canvas logic              | Rejected                                    | It was decorative motion with no semantic state and resembled a generic developer effect                                |
| Star field with luminous nodes                                         | Spatial sketch            | Rejected immediately                        | It risked Website 04's space, beacon, and orbital archive vocabulary                                                    |
| Uniform vector arrows on a technical grid                              | SVG                       | Rejected                                    | It looked like a data visualisation/dashboard and lacked an authored silhouette                                         |
| Dense tactile relief flowing around two voids                          | Built-in image generation | Rejected as composition; mark note retained | Governed flow was visible, but the wall-like relief was too crowded and could overpower content                         |
| Batched 3D prisms around one attractor                                 | Blender                   | Retained only as close-scale feasibility    | It proved orientation and lighting, but the first render was too uniform and bright for the final page                  |
| Sparse field with protected corridors, media boundary, and memory wake | SVG                       | **Selected for Direction 03**               | Each state has an explicit cause, the non-object identity survives mobile, and the law becomes a distinct Play mechanic |

## Built-in image-generation exploration

Mode: built-in ImageGen, abstract environment/surface study only. Local output:
`.local-validation/concept-renders/constraint-field-imagegen-exploration.png`.

Prompt:

> Hundreds of short rounded rice-grain or mineral-prism marks in a storm-blue space responding to
> invisible vector forces around a calm void and rectangular boundary; sparse clay, mist, gold and
> periwinkle response; no text, UI, person, robot, grass, plants, planet, stars, beacons, diamond,
> light columns, orbit, HUD, compass, cyberpunk panels, or explosion.

Inspection: the output clearly showed collective response and a useful rounded-prism surface.
However, its near-total surface coverage read as a sculpted wall and left insufficient content
quiet. The generated composition was rejected. The selected system dramatically lowers density and
reserves explicit mark-free corridors for semantic content.

## Blender exploration

The reproducible script at `tools/blender/checkpoint2_system_studies.py` rendered
`.local-validation/blender/constraint-field-study.png` in Blender 5.2.0 LTS. It confirmed that:

- one instanced primitive can form the environment;
- orientation communicates the force more clearly than translation;
- close-up marks need darker base colours and more density variation than the first render;
- opaque marks avoid the transparency and particle-glow language of the references.

The `.blend` and render remain local. The production direction should use one batched runtime
geometry or SVG stable states, not ship the study.

## Refinement performed after inspection

The final board makes the attractor off-centre, introduces an explicit evidence void, limits colour
to state-bearing marks, reduces mobile density, documents static reduced-motion states, and gives
return a deterministic wake rather than ambient drift.
