"""Render every authoritative vegetation GLB with original materials and scale references."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


REPO_ROOT = Path(__file__).resolve().parents[3]


def arguments() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--catalogue",
        type=Path,
        default=REPO_ROOT / "docs" / "hinode" / "vegetation-catalogue.json",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPO_ROOT / "artifacts" / "hinode" / "vegetation" / "renders",
    )
    return parser.parse_args(raw)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.use_file_extension = True
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.35
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Catalogue_World")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.035, 0.05, 0.085, 1)
    background.inputs["Strength"].default_value = 0.55


def material(name: str, color: tuple[float, float, float], emission: float = 0.0):
    created = bpy.data.materials.new(name)
    created.use_nodes = True
    bsdf = created.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = 0.68
    emission_color = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
    if emission_color:
        emission_color.default_value = (*color, 1)
    if bsdf.inputs.get("Emission Strength"):
        bsdf.inputs["Emission Strength"].default_value = emission
    return created


def bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [
        obj.matrix_world @ Vector(corner)
        for obj in objects
        if obj.type == "MESH"
        for corner in obj.bound_box
    ]
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def add_reference_human(x: float, y: float, target: bpy.types.Collection, mat) -> None:
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.19, depth=1.28, location=(x, y, 0.64))
    body = bpy.context.object
    body.name = "SCALE_Human_1_8m"
    body.data.materials.append(mat)
    target.objects.link(body)
    bpy.context.collection.objects.unlink(body)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.26, location=(x, y, 1.54))
    head = bpy.context.object
    head.name = "SCALE_Human_Head"
    head.data.materials.append(mat)
    target.objects.link(head)
    bpy.context.collection.objects.unlink(head)


def add_reference_coupe(x: float, y: float, target: bpy.types.Collection, mat) -> None:
    bpy.ops.mesh.primitive_cube_add(location=(x, y, 0.48))
    lower = bpy.context.object
    lower.name = "SCALE_HinodeCoupe_4_35m"
    lower.dimensions = (4.35, 1.85, 0.72)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lower.data.materials.append(mat)
    target.objects.link(lower)
    bpy.context.collection.objects.unlink(lower)
    bpy.ops.mesh.primitive_cube_add(location=(x - 0.2, y, 1.02))
    cabin = bpy.context.object
    cabin.name = "SCALE_HinodeCoupe_Cabin"
    cabin.dimensions = (2.15, 1.62, 0.65)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    cabin.data.materials.append(mat)
    target.objects.link(cabin)
    bpy.context.collection.objects.unlink(cabin)


def aim(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_asset(asset: dict[str, object], output_dir: Path) -> None:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=asset["sourcePath"])
    imported = list(bpy.context.scene.objects)
    meshes = [obj for obj in imported if obj.type == "MESH"]
    minimum, maximum = bounds(meshes)
    center = (minimum + maximum) * 0.5
    span = max(maximum.x - minimum.x, maximum.y - minimum.y, 1.0)
    height = max(maximum.z - minimum.z, 1.0)

    display = bpy.data.collections.new("DISPLAY_Original_Materials")
    bpy.context.scene.collection.children.link(display)
    # One equal-width world-space cell per requested view keeps the rendered
    # object centres aligned with the contact-sheet FRONT/SIDE/THREE-QUARTER
    # labels and prevents crowns bleeding into neighbouring cells.
    cell_width = max(span * 1.42, 6.8)
    slots = (-cell_width, 0.0, cell_width)
    rotations = (0.0, math.radians(90), math.radians(45))
    for slot, rotation in zip(slots, rotations, strict=True):
        transform = (
            Matrix.Translation((slot, 0, 0))
            @ Matrix.Rotation(rotation, 4, "Z")
            @ Matrix.Translation((-center.x, -center.y, -minimum.z))
        )
        for source in meshes:
            duplicate = source.copy()
            duplicate.data = source.data.copy()
            duplicate.name = f"VIEW_{int(math.degrees(rotation)):03d}_{source.name}"
            duplicate.parent = None
            duplicate.matrix_world = transform @ source.matrix_world
            duplicate.hide_render = False
            duplicate.hide_viewport = False
            display.objects.link(duplicate)
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)

    references = bpy.data.collections.new("SCALE_REFERENCES")
    bpy.context.scene.collection.children.link(references)
    human_mat = material("MAT_Scale_Human", (0.98, 0.15, 0.32), emission=0.18)
    car_mat = material("MAT_Scale_Coupe", (0.12, 0.78, 0.96), emission=0.12)
    # Repeat the references for each view.  They are actual 1:1 scene-scale
    # objects, not graphic legends added after rendering.
    for slot in slots:
        add_reference_human(slot + cell_width * 0.38, -span * 0.18, references, human_mat)
        add_reference_coupe(slot - cell_width * 0.12, -span * 0.58, references, car_mat)

    ground_mat = material("MAT_Catalogue_Ground", (0.025, 0.038, 0.062))
    bpy.ops.mesh.primitive_plane_add(size=max(100.0, span * 7), location=(0, 0, -0.03))
    ground = bpy.context.object
    ground.name = "Catalogue_Ground"
    ground.data.materials.append(ground_mat)

    key_data = bpy.data.lights.new("LIGHT_Catalogue_Key", "AREA")
    key_data.energy = 950
    key_data.color = (0.9, 0.96, 1.0)
    key_data.shape = "DISK"
    key_data.size = max(7.0, span * 0.72)
    key = bpy.data.objects.new("LIGHT_Catalogue_Key", key_data)
    key.location = (-span * 0.45, -span * 0.9, height * 1.15)
    bpy.context.scene.collection.objects.link(key)
    aim(key, Vector((0, 0, height * 0.45)))

    fill_data = bpy.data.lights.new("LIGHT_Catalogue_Fill", "AREA")
    fill_data.energy = 520
    fill_data.color = (1.0, 0.62, 0.42)
    fill_data.size = max(7.0, span * 0.68)
    fill = bpy.data.objects.new("LIGHT_Catalogue_Fill", fill_data)
    fill.location = (span * 1.8, span * 0.6, height)
    bpy.context.scene.collection.objects.link(fill)
    aim(fill, Vector((0, 0, height * 0.4)))

    back_data = bpy.data.lights.new("LIGHT_Catalogue_Back", "AREA")
    back_data.energy = 800
    back_data.color = (0.58, 0.76, 1.0)
    back_data.size = max(7.0, span * 0.72)
    back = bpy.data.objects.new("LIGHT_Catalogue_Back", back_data)
    back.location = (0, span * 0.9, height * 1.1)
    bpy.context.scene.collection.objects.link(back)
    aim(back, Vector((0, 0, height * 0.42)))

    # Allow genuine empty margin around all three complete views.  The earlier
    # framing fitted the mathematical span too tightly and clipped wide crowns.
    total_width = cell_width * 3.0
    camera_data = bpy.data.cameras.new("CAM_Catalogue")
    camera_data.type = "ORTHO"
    reference_height = 1.8
    camera_data.ortho_scale = max(
        max(height, reference_height) * 1.52,
        total_width / (1280 / 720),
        4.2,
    )
    camera = bpy.data.objects.new("CAM_Catalogue", camera_data)
    camera.location = (0, -max(45.0, span * 5), max(height, reference_height) * 0.56)
    bpy.context.scene.collection.objects.link(camera)
    aim(camera, Vector((0, 0, max(height, reference_height) * 0.44)))
    bpy.context.scene.camera = camera

    output = output_dir / f"{Path(asset['sourceFilename']).stem}.png"
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {asset['sourceFilename']} -> {output}")


def main() -> None:
    args = arguments()
    report = json.loads(args.catalogue.read_text(encoding="utf-8"))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for asset in report["assets"]:
        render_asset(asset, args.output_dir)


if __name__ == "__main__":
    main()
