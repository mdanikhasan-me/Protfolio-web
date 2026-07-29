# Hinode Blender production boundary

The browser editor owns the complete city layout. There is no full-city Blender master and no
rejected slice source in this directory.

Current approved project-local Blender source:

- `vehicles/mah_nightline_r34_derivative.blend`

The derivative is built by `tools/blender/hinode/prepare_mah_nightline.py` from the read-only
original recorded in `docs/hinode/mah-nightline-r34-manifest.json`. The original source hash must
remain unchanged. Attribution is retained in the derivative and exported GLB metadata.

Blender is limited to asset inspection, derivative preparation, modular modelling, LODs, collision
proxies, baking and export. Background execution is preferred. A visible Blender window is for
completed milestone review only and must never lock the user's viewport.

Generated vegetation derivatives are intentionally absent while their source permissions remain
pending. The catalogue and derivative recipe are retained as research, but no unresolved vegetation
asset is distributed or loaded by the runtime.
