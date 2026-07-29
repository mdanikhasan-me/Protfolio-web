"""Read-only Blender asset inspection for Hinode source-library audits."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def arguments() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path)
    parser.add_argument("--output", type=Path)
    return parser.parse_args(raw)


def load_source(source: Path | None) -> Path:
    if source is None:
        return Path(bpy.data.filepath).resolve()
    resolved = source.resolve()
    if resolved.suffix.lower() == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(resolved), load_ui=False)
    elif resolved.suffix.lower() in {".glb", ".gltf"}:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(resolved))
    else:
        raise ValueError(f"Unsupported source format: {resolved.suffix}")
    return resolved


def json_value(value):
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if hasattr(value, "to_list"):
        return value.to_list()
    if isinstance(value, (list, tuple)):
        return [json_value(item) for item in value]
    return str(value)


def custom_properties(owner) -> dict[str, object]:
    return {
        key: json_value(owner[key])
        for key in owner.keys()
        if key != "_RNA_UI"
    }


def mesh_triangles(obj: bpy.types.Object) -> int:
    if obj.type != "MESH":
        return 0
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        return len(mesh.loop_triangles)
    finally:
        evaluated.to_mesh_clear()


def world_bounds(objects: list[bpy.types.Object]) -> tuple[list[float], list[float]] | None:
    points = [
        obj.matrix_world @ Vector(corner)
        for obj in objects
        if obj.type == "MESH"
        for corner in obj.bound_box
    ]
    if not points:
        return None
    minimum = [min(point[axis] for point in points) for axis in range(3)]
    maximum = [max(point[axis] for point in points) for axis in range(3)]
    return minimum, maximum


def main() -> None:
    args = arguments()
    source = load_source(args.source)
    objects = list(bpy.data.objects)
    mesh_objects = [obj for obj in objects if obj.type == "MESH"]
    bounds = world_bounds(mesh_objects)
    record = {
        "sourcePath": str(source),
        "blenderVersion": bpy.app.version_string,
        "scene": bpy.context.scene.name,
        "unitSettings": {
            "system": bpy.context.scene.unit_settings.system,
            "scaleLength": bpy.context.scene.unit_settings.scale_length,
            "lengthUnit": bpy.context.scene.unit_settings.length_unit,
        },
        "sceneProperties": custom_properties(bpy.context.scene),
        "worldProperties": custom_properties(bpy.context.scene.world)
        if bpy.context.scene.world
        else {},
        "counts": {
            "objects": len(objects),
            "meshes": len(mesh_objects),
            "triangles": sum(mesh_triangles(obj) for obj in mesh_objects),
            "materials": len(bpy.data.materials),
            "images": len(bpy.data.images),
            "actions": len(bpy.data.actions),
            "textBlocks": len(bpy.data.texts),
        },
        "bounds": {
            "minimum": bounds[0],
            "maximum": bounds[1],
            "dimensions": [
                bounds[1][axis] - bounds[0][axis] for axis in range(3)
            ],
        }
        if bounds
        else None,
        "objects": [
            {
                "name": obj.name,
                "type": obj.type,
                "parent": obj.parent.name if obj.parent else None,
                "location": list(obj.location),
                "rotationEuler": list(obj.rotation_euler),
                "scale": list(obj.scale),
                "dimensions": list(obj.dimensions),
                "originWorld": list(obj.matrix_world.translation),
                "hiddenViewport": bool(obj.hide_viewport or obj.hide_get()),
                "hiddenRender": bool(obj.hide_render),
                "materials": [
                    slot.material.name
                    for slot in obj.material_slots
                    if slot.material is not None
                ],
                "triangles": mesh_triangles(obj),
                "customProperties": custom_properties(obj),
            }
            for obj in objects
        ],
        "materials": [
            {
                "name": material.name,
                "useNodes": material.use_nodes,
                "customProperties": custom_properties(material),
            }
            for material in bpy.data.materials
        ],
        "images": [
            {
                "name": image.name,
                "filepath": image.filepath,
                "packed": image.packed_file is not None,
                "size": list(image.size),
                "customProperties": custom_properties(image),
            }
            for image in bpy.data.images
        ],
        "actions": [
            {
                "name": action.name,
                "frameRange": list(action.frame_range),
                "customProperties": custom_properties(action),
            }
            for action in bpy.data.actions
        ],
        "texts": [
            {
                "name": text.name,
                "body": text.as_string(),
                "customProperties": custom_properties(text),
            }
            for text in bpy.data.texts
        ],
    }
    encoded = json.dumps(record, ensure_ascii=False, indent=2)
    if args.output:
        output = args.output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded + "\n", encoding="utf-8")
        print(f"Hinode source audit: {output}")
    else:
        print("HINODE_SOURCE_AUDIT_BEGIN")
        print(encoded)
        print("HINODE_SOURCE_AUDIT_END")


if __name__ == "__main__":
    main()
