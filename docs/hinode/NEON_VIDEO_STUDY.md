# Hinode neon and billboard reference study

Authoritative source: `C:\Users\anikh\Videos\NVIDIA\Desktop\New folder\web neon effects and bill borad really high quaility and optimized .mp4`

Source integrity policy: the MP4 is read-only. The study uses extracted project-local review frames under `artifacts/hinode/neon-video/`; the source video is never edited or overwritten.

## Source facts

- H.264, 1920 × 1080, 60 fps
- 7,346 video frames
- 122.434 seconds
- 245,208,537 bytes
- The source is a desktop/browser recording of an interactive neon portfolio scene. Browser chrome and the reference site's own interface are not part of the Hinode art direction.
- Twenty-five samples at five-second intervals cover the entire running time. The 4K contact sheet is `artifacts/hinode/neon-video/hinode-neon-reference-contact-sheet-4k.png`.

## What the moving reference demonstrates

1. **Hero billboard scale** — one dominant panel typically occupies roughly 18–35% of the visible commercial cluster width. It anchors a sightline rather than filling every façade.
2. **Supporting billboard scale** — medium panels are roughly one third to one half of the hero panel's width and are staggered across several depth planes.
3. **Blade sign scale** — narrow signs use a strong vertical ratio, usually between 1:3 and 1:6, and remain readable during lateral camera motion.
4. **Shop fascia scale** — fascia signs stay close to the shop bay width and form a lower, warmer signage band beneath the large cool-white and cyan panels.
5. **Sign depth** — visible casings and offsets create parallax. Panels do not sit coplanar with every wall.
6. **Emissive hierarchy** — white is the brightest focal value, pale cyan is the principal cool accent, red/magenta is used for navigation and contrast, and small amber accents prevent a purely blue city.
7. **Bloom threshold** — bloom is selective. Bright sign cores bloom while dark structural surfaces retain hard silhouettes.
8. **Negative space** — approximately 55–70% of most views remains structurally dark. Empty gaps separate commercial clusters.
9. **Reflected colour** — reflected sign colour is broader and dimmer than the source. It appears on selected wet or polished patches, not on every material.
10. **Parallax** — foreground blades, middle-distance fascia panels, and large background boards move at visibly different rates.
11. **Spacing** — a sightline normally has one or two dominant boards, three to six supporting panels, and small signs used as rhythm rather than uniform wallpaper.
12. **Camera readability** — bold silhouettes, short fictional words, large numerals, and thick graphic borders survive motion better than dense copy.
13. **Light falloff** — emissive surfaces provide most of the apparent illumination. A small number of local lights or baked spill zones support nearby geometry.
14. **Browser optimisation** — the visual result is consistent with shared emissive atlases, simple panel geometry, baked/controlled reflection, and a selective post-process pass rather than hundreds of dynamic lights.

## Hinode implementation targets

| Type | Nominal visible size | Casing depth | Relative emissive strength | Placement rule |
| --- | --- | --- | --- | --- |
| Horizontal shop fascia | 2.4–5.5 m × 0.45–0.9 m | 0.08–0.18 m | 2.5–4.5 | One per active commercial bay |
| Vertical blade sign | 0.55–1.1 m × 2.0–4.8 m | 0.12–0.25 m | 3.5–6.0 | Perpendicular to façade; preserve driving clearance |
| Window lightbox | 0.6–1.8 m × 0.45–1.2 m | 0.04–0.1 m | 2.0–3.5 | Inside a shallow exterior-facing recess |
| Hanging restaurant sign | 0.5–0.9 m × 0.5–1.0 m | 0.1–0.2 m | 3.0–5.0 | Above the pedestrian edge, never the vehicle envelope |
| Lantern sign | 0.28–0.48 m diameter × 0.45–0.8 m | volumetric shell | 2.0–3.5 | Warm supporting accent only |
| Medium wall billboard | 3.0–6.0 m × 1.6–3.2 m | 0.12–0.3 m | 4.0–7.0 | One per secondary commercial block at most |
| Hero billboard | 8.0–14.0 m × 3.5–6.0 m | 0.25–0.55 m | 6.0–10.0 | Landmark sightline; no vegetation obstruction |
| Directional sign | 1.2–2.8 m × 0.35–0.7 m | 0.05–0.12 m | 1.5–2.5 | Road-information hierarchy, not advertising |
| Parking sign | 0.45–0.8 m × 0.7–1.2 m | 0.05–0.12 m | 1.8–3.0 | Service and secondary roads |
| Small service sign | 0.35–1.2 m × 0.2–0.55 m | 0.03–0.08 m | 1.2–2.2 | Low-frequency utility detail |

## Fictional Hinode sign language

- Use original fictional names such as **Akebono Auto**, **Kitsune Noodle**, **Aoi Radio**, **Mizuno Tyres**, **Port 17**, **Sazanami Café**, **Hinode Parking**, and **Kawase Service**.
- Graphics use short Latin and invented kana-like geometric marks, route numerals, stripes, circles, waves, fan shapes, and racing diagrams.
- Do not reproduce any readable reference-site names, advertisements, logos, characters, or exact layouts.
- Commercial alley: warm fascia and lantern signs, very few medium panels.
- Secondary commercial road: stronger cyan/red blades and one medium wall billboard.
- Downtown blockout: hero billboard zones are reserved but detailed graphics wait for district approval.
- Residential, industrial, waterfront, and touge zones remain substantially darker.

## Runtime and bake targets

- Shared emissive atlas with padding and mip-safe borders.
- Selective bloom threshold around `1.1–1.3`, strength `0.35–0.55`, radius `0.25–0.4`; tune against browser evidence.
- At most one dynamic spill light per hero cluster and one per key junction. Supporting signs use emissive material plus baked spill.
- Matte structural materials remain in the `0.62–0.86` roughness range.
- Reflective treatment is limited to authored wet patches, painted metal, glass, and canal water.
- Every sign receives a casing, a mounting depth, a valid sign zone, and a sightline/clearance record.
- Sign brightness must be evaluated from the moving chase camera, not only from a static beauty view.
