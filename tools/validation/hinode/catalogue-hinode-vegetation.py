"""Catalogue the authoritative Hinode vegetation GLBs without modifying them."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT = REPO_ROOT / "docs" / "hinode" / "vegetation-catalogue.json"
DEFAULT_MARKDOWN = REPO_ROOT / "docs" / "hinode" / "VEGETATION_CATALOGUE.md"


def arguments() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--markdown", type=Path, default=DEFAULT_MARKDOWN)
    return parser.parse_args(raw)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def family_for(stem: str) -> tuple[str, int | None]:
    lowered = stem.lower()
    match = re.search(r"(?:_v|_)(\d+)$", lowered)
    variant = int(match.group(1)) if match else None
    if "sakura" in lowered:
        return "sakura blossom tree", variant or 1
    if "bush" in lowered:
        return "bush", variant or 1
    if "tree-grass" in lowered:
        return "tree and grass combination", variant or 1
    if "nature_tree" in lowered:
        return "broad-canopy tree", variant or 1
    return "anime tree", variant


def usage_for(family: str) -> dict[str, object]:
    if family == "sakura blossom tree":
        return {
            "districts": ["secondary commercial", "waterfront", "shrine/scenic", "touge accent"],
            "scaleRange": [0.9, 1.08],
            "density": "low focal clusters; never uniform",
        }
    if family == "bush":
        return {
            "districts": ["residential", "waterfront", "touge", "shrine/scenic"],
            "scaleRange": [0.8, 1.15],
            "density": "small groups of 2-5 inside approved planting zones",
        }
    if family == "tree and grass combination":
        return {
            "districts": ["touge", "waterfront", "park/scenic"],
            "scaleRange": [0.9, 1.1],
            "density": "sparse authored clusters; avoid commercial alleys",
        }
    if family == "broad-canopy tree":
        return {
            "districts": ["residential", "waterfront", "touge", "park/scenic"],
            "scaleRange": [0.85, 1.1],
            "density": "medium spacing with canopy-radius validation",
        }
    return {
        "districts": ["residential", "secondary commercial", "waterfront", "touge"],
        "scaleRange": [0.85, 1.12],
        "density": "district-profiled rows or clusters; highest only on touge",
    }


def mesh_triangles(obj: bpy.types.Object) -> int:
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    count = len(mesh.loop_triangles)
    evaluated.to_mesh_clear()
    return count


def world_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [
        obj.matrix_world @ Vector(corner)
        for obj in objects
        if obj.type == "MESH"
        for corner in obj.bound_box
    ]
    if not points:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def round_vector(value: Vector) -> list[float]:
    return [round(float(component), 4) for component in value]


def catalogue_asset(path: Path) -> dict[str, object]:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = list(bpy.context.scene.objects)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    minimum, maximum = world_bounds(meshes)
    dimensions = maximum - minimum
    material_names = sorted(
        {
            slot.material.name
            for obj in meshes
            for slot in obj.material_slots
            if slot.material is not None
        }
    )
    image_records: list[dict[str, object]] = []
    missing_links: list[str] = []
    for image in bpy.data.images:
        if image.name == "Render Result":
            continue
        external = Path(bpy.path.abspath(image.filepath)) if image.filepath else None
        packed = image.packed_file is not None
        if external and not packed and not external.exists():
            missing_links.append(str(external))
        image_records.append(
            {
                "name": image.name,
                "path": str(external) if external else None,
                "packed": packed,
                "resolution": [int(image.size[0]), int(image.size[1])],
                "colorspace": image.colorspace_settings.name,
            }
        )
    family, variant = family_for(path.stem)
    usage = usage_for(family)
    lod_names = sorted(obj.name for obj in objects if re.search(r"(?:^|[_\-.])lod\d*", obj.name, re.I))
    collision_names = sorted(
        obj.name for obj in objects if re.search(r"collider|collision|ucx_|ubx_|usp_", obj.name, re.I)
    )
    pivots = [
        {"object": obj.name, "position": round_vector(obj.matrix_world.translation)}
        for obj in objects
        if obj.parent is None
    ]
    return {
        "sourceFilename": path.name,
        "sourcePath": str(path),
        "sourceSha256": sha256(path),
        "fileFormat": path.suffix.lower().lstrip("."),
        "assetFamily": family,
        "variant": variant,
        "objectNames": sorted(obj.name for obj in objects),
        "objectCount": len(objects),
        "meshCount": len(meshes),
        "triangleCount": sum(mesh_triangles(obj) for obj in meshes),
        "dimensionsMetres": round_vector(dimensions),
        "boundingBox": {
            "minimum": round_vector(minimum),
            "maximum": round_vector(maximum),
        },
        "pivotPositions": pivots,
        "groundContactMetres": round(float(minimum.z), 4),
        "upAxis": "Z-up after Blender glTF import; authoritative glTF source is Y-up",
        "materials": material_names,
        "textures": image_records,
        "existingLods": lod_names,
        "existingCollisions": collision_names,
        "missingTextureLinks": sorted(set(missing_links)),
        "recommendedDistrictUsage": usage["districts"],
        "recommendedScaleRange": usage["scaleRange"],
        "recommendedDensity": usage["density"],
        "suitableForInstancing": len(meshes) > 0 and not missing_links,
        "derivedCopyNeeded": bool(
            abs(minimum.z) > 0.005
            or any(abs(component) > 0.005 for pivot in pivots for component in pivot["position"][:2])
            or not lod_names
        ),
        "derivedCopyReasons": [
            reason
            for condition, reason in (
                (abs(minimum.z) > 0.005, "ground-contact correction"),
                (not lod_names, "runtime LOD preparation"),
                (bool(missing_links), "texture relinking"),
            )
            if condition
        ],
    }


def markdown(report: dict[str, object]) -> str:
    lines = [
        "# Hinode vegetation catalogue",
        "",
        f"Generated: `{report['generatedAt']}`",
        "",
        f"Authoritative read-only source: `{report['sourceRoot']}`",
        "",
        "The SHA-256 value for every source is recorded below. This catalogue imports the GLBs for inspection only; it does not save, rewrite, rename, or transform any source asset.",
        "",
        "| Asset | Family | Variant | Dimensions m (X × Y × Z) | Tris | Objects | Materials | Textures | Ground Z | LODs | Collision |",
        "| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for asset in report["assets"]:
        dimensions = " × ".join(f"{value:.2f}" for value in asset["dimensionsMetres"])
        lines.append(
            f"| `{asset['sourceFilename']}` | {asset['assetFamily']} | "
            f"{asset['variant'] or '—'} | {dimensions} | {asset['triangleCount']:,} | "
            f"{asset['objectCount']} | {len(asset['materials'])} | {len(asset['textures'])} | "
            f"{asset['groundContactMetres']:.3f} | {len(asset['existingLods'])} | "
            f"{len(asset['existingCollisions'])} |"
        )
    lines += ["", "## Asset records", ""]
    for asset in report["assets"]:
        lines += [
            f"### {asset['sourceFilename']}",
            "",
            f"- SHA-256: `{asset['sourceSha256']}`",
            f"- Objects: {', '.join(f'`{name}`' for name in asset['objectNames']) or 'none'}",
            f"- Materials: {', '.join(f'`{name}`' for name in asset['materials']) or 'none'}",
            f"- Bounding box: `{asset['boundingBox']['minimum']}` to `{asset['boundingBox']['maximum']}`",
            f"- Recommended districts: {', '.join(asset['recommendedDistrictUsage'])}",
            f"- Scale range: `{asset['recommendedScaleRange'][0]}`–`{asset['recommendedScaleRange'][1]}`",
            f"- Density: {asset['recommendedDensity']}",
            f"- Instancing: {'suitable' if asset['suitableForInstancing'] else 'needs repair first'}",
            f"- Derived copy: {'required' if asset['derivedCopyNeeded'] else 'not currently required'}"
            + (
                f" ({', '.join(asset['derivedCopyReasons'])})"
                if asset["derivedCopyReasons"]
                else ""
            ),
            f"- Missing texture links: {', '.join(asset['missingTextureLinks']) or 'none'}",
            "",
        ]
    return "\n".join(lines) + "\n"


def main() -> None:
    args = arguments()
    source_root = args.source_root.resolve()
    assets = [catalogue_asset(path) for path in sorted(source_root.glob("*.glb"))]
    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceRoot": str(source_root),
        "sourcePolicy": "read-only; originals are never modified",
        "sourceFileCount": len(assets),
        "assets": assets,
        "totals": {
            "assets": len(assets),
            "objects": sum(asset["objectCount"] for asset in assets),
            "triangles": sum(asset["triangleCount"] for asset in assets),
            "missingTextureLinks": sum(len(asset["missingTextureLinks"]) for asset in assets),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.markdown.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    args.markdown.write_text(markdown(report), encoding="utf-8")
    print(json.dumps(report["totals"], indent=2))
    print(f"Catalogue: {args.output}")
    print(f"Markdown: {args.markdown}")


if __name__ == "__main__":
    main()
